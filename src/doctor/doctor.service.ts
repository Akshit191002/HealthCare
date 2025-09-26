import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { encryptPHI, decryptPHI } from '../utils/encryption.util';
import { FhirService } from '../fhir/fhir.service';
import { Doctor, DoctorDocument } from './doctor.schema';
import { RegisterDoctorDto } from './dto/register-doctor.dto';
import { Appointment, AppointmentDocument } from 'src/appointment/appointment.schema';
import { PatientDocument } from 'src/patient/patient.schema';

@Injectable()
export class DoctorsService {
    private readonly logger = new Logger(DoctorsService.name);

    constructor(
        @InjectModel(Doctor.name) private doctorModel: Model<DoctorDocument>,
        @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
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

    async getMyDoctor(userId: string) {
        const doctor = await this.doctorModel.findOne({ user: userId });
        if (!doctor) throw new NotFoundException('Doctor not found for this user');

        const decryptedData = JSON.parse(decryptPHI(doctor.encryptedData, doctor.iv, doctor.tag));
        return { id: doctor._id, fhirId: doctor.fhirId, data: decryptedData };
    }

    async getAllDoctors() {
        const doctors = await this.doctorModel.find();
        if (!doctors.length) throw new NotFoundException('No doctors found');

        return doctors.map((doc) => ({
            id: doc._id,
            fhirId: doc.fhirId,
            data: JSON.parse(decryptPHI(doc.encryptedData, doc.iv, doc.tag)),
        }));
    }

    async getDoctorByUserId(userId: string) {
        const doctor = await this.doctorModel.findOne({ user: userId });
        if (!doctor) throw new NotFoundException('Doctor not found');
        const decryptedData = JSON.parse(decryptPHI(doctor.encryptedData, doctor.iv, doctor.tag));
        return { id: doctor._id, fhirId: doctor.fhirId, data: decryptedData };
    }
}