import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { encryptPHI, decryptPHI } from '../../common/encryption/encryption.util';
import { FhirService } from '../../common/fhir/fhir.service';
import { Doctor, DoctorDocument } from './doctor.schema';
import { RegisterDoctorDto } from './dto/register-doctor.dto';

@Injectable()
export class DoctorsService {
    private readonly logger = new Logger(DoctorsService.name);

    constructor(
        @InjectModel(Doctor.name) private doctorModel: Model<DoctorDocument>,
        private readonly fhirService: FhirService,
    ) { }

    async registerDoctor(data: RegisterDoctorDto, userId: string) {
        if (!data || !data.firstName || !data.lastName || !data.specialization || !data.licenseNumber) {
            throw new BadRequestException('Invalid doctor data. All fields are required.');
        }

        const existingDoctor = await this.doctorModel.findOne({ user: userId });
        if (existingDoctor) {
            throw new BadRequestException('Doctor profile already exists for this account');
        }

        const { encryptedData, iv, tag } = encryptPHI(JSON.stringify(data));

        const fhirId = await this.fhirService.createPractitioner(data);

        const doctor = new this.doctorModel({
            encryptedData,
            iv,
            tag,
            fhirId,
            user: userId,
        });

        await doctor.save();

        this.logger.log(`Doctor saved locally with FHIR ID: ${fhirId}`);
        return { id: doctor._id, fhirId };
    }


    async getDoctorById(id: string, userId?: string) {
        const query: any = { _id: id };
        if (userId) query.user = userId;
        const doctor = await this.doctorModel.findOne({ _id: id, user: userId });
        if (!doctor) throw new NotFoundException('Doctor not found or unauthorized');

        const decryptedData = JSON.parse(decryptPHI(doctor.encryptedData, doctor.iv, doctor.tag));
        return {
            id: doctor._id,
            fhirId: doctor.fhirId,
            data: decryptedData,
        };
    }

    async getMyAccount(userId: string) {
        const doctor = await this.doctorModel.findOne({ user: userId });
        if (!doctor) throw new NotFoundException('Doctor not found for this user');

        const decryptedData = JSON.parse(decryptPHI(doctor.encryptedData, doctor.iv, doctor.tag));
        return { id: doctor._id, fhirId: doctor.fhirId, data: decryptedData };
    }

    async getAllDoctors(
        page: number = 1, limit: number = 10, search?: string, gender?: string, specialization?: string, city?: string, state?: string, country?: string,) {
        const query: FilterQuery<any> = {};

        if (search) {
            query.$or = [
                { 'decryptedData.firstName': { $regex: search, $options: 'i' } },
                { 'decryptedData.lastName': { $regex: search, $options: 'i' } },
                { 'decryptedData.specialization': { $regex: search, $options: 'i' } },
            ];
        }

        if (gender) {
            query['decryptedData.gender'] = gender;
        }
        if (specialization) {
            query['decryptedData.specialization'] = { $regex: `^${specialization}$`, $options: 'i' };
        }
        if (city) query['decryptedData.address.city'] = { $regex: city, $options: 'i' };
        if (state) query['decryptedData.address.state'] = { $regex: state, $options: 'i' };
        if (country) query['decryptedData.address.country'] = { $regex: country, $options: 'i' };

        const doctors = await this.doctorModel
            .find(query)
            .skip((page - 1) * limit)
            .limit(limit);

        if (!doctors.length) {
            throw new NotFoundException('No doctors found');
        }

        const total = await this.doctorModel.countDocuments(query);

        return {
            total,
            page,
            limit,
            data: doctors.map((doc) => ({
                id: doc._id,
                fhirId: doc.fhirId,
                data: JSON.parse(decryptPHI(doc.encryptedData, doc.iv, doc.tag)),
            })),
        };
    }

    async getDoctorByUserId(userId: string) {
        const doctor = await this.doctorModel.findOne({ user: userId });
        if (!doctor) throw new NotFoundException('Doctor not found');
        const decryptedData = JSON.parse(decryptPHI(doctor.encryptedData, doctor.iv, doctor.tag));
        return { id: doctor._id, fhirId: doctor.fhirId, data: decryptedData };
    }
}