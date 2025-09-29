import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FhirService } from '../fhir/fhir.service';
import { encryptPHI, decryptPHI } from '../utils/encryption.util';
import { Patient, PatientDocument } from './patient.schema';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private fhirService: FhirService,
  ) { }

  private calculateAge(dob: string): number {
    if (!dob) return 0;
    const birth = new Date(dob);
    const now = new Date();
    return now.getFullYear() - birth.getFullYear();
  }

  async registerPatient(data: RegisterPatientDto, userId: string) {
    if (!data || !data.firstName || !data.lastName || !data.dob || !data.gender) {
      throw new BadRequestException('Invalid patient data. All fields are required.');
    }

    const userObjectId = new Types.ObjectId(userId);

    let patientDoc = await this.patientModel.findOne({ user: userObjectId });

    if (!patientDoc) {
      patientDoc = new this.patientModel({ user: userObjectId, patients: [] });
    }

    if (patientDoc.patients.length >= 4) {
      throw new BadRequestException('You can create a maximum of 4 patient accounts');
    }

    const { encryptedData, iv, tag } = encryptPHI(JSON.stringify(data));
    const fhirId = await this.fhirService.createPatient(data);

    patientDoc.patients.push({
      encryptedData,
      iv,
      tag,
      fhirId,
    });

    await patientDoc.save();

    this.logger.log(`Patient added for user ${userId} with FHIR ID: ${fhirId}`);
    return { id: patientDoc._id, fhirId };
  }

  // async getAllPatients() {
  //   const patientDocs = await this.patientModel.find();
  //   if (!patientDocs || patientDocs.length === 0) {
  //     return []
  //   }

  //   const decrypted = patientDocs.flatMap((doc) =>
  //     doc.patients.map((p) => ({
  //       user: doc.user,
  //       fhirId: p.fhirId,
  //       data: JSON.parse(decryptPHI(p.encryptedData, p.iv, p.tag)),
  //     })),
  //   );

  //   this.logger.log(`Fetched ${decrypted.length} patients`);
  //   return decrypted;
  // }

  async getAllPatients(query: {
    page?: number;
    limit?: number;
    search?: string;
    gender?: string;
    bloodGroup?: string;
    heightFrom?: number;
    heightTo?: number;
    weightFrom?: number;
    weightTo?: number;
  }) {
    const { page = 1, limit = 10, search, gender, bloodGroup, heightFrom, heightTo, weightFrom, weightTo } = query;
    const patientDocs = await this.patientModel.find();
    if (!patientDocs || patientDocs.length === 0) return { total: 0, data: [] };

    let patients = patientDocs.flatMap((doc) =>
      doc.patients.map((p) => {
        const data = JSON.parse(decryptPHI(p.encryptedData, p.iv, p.tag));
        return {
          user: doc.user,
          fhirId: p.fhirId,
          id: p._id?.toString(),
          ...data,
        };
      }),
    );

    if (search) {
      const lowerSearch = search.toLowerCase();
      patients = patients.filter(
        (p) =>
          (p.firstName && p.firstName.toLowerCase().includes(lowerSearch)) ||
          (p.lastName && p.lastName.toLowerCase().includes(lowerSearch)),
      );
    }

    if (gender) patients = patients.filter((p) => p.gender?.toLowerCase() === gender.toLowerCase());
    if (bloodGroup) patients = patients.filter((p) => p.bloodGroup?.toLowerCase() === bloodGroup.toLowerCase());
    if (heightFrom !== undefined) patients = patients.filter((p) => p.height >= heightFrom);
    if (heightTo !== undefined) patients = patients.filter((p) => p.height <= heightTo);
    if (weightFrom !== undefined) patients = patients.filter((p) => p.weight >= weightFrom);
    if (weightTo !== undefined) patients = patients.filter((p) => p.weight <= weightTo);

    const total = patients.length;

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = patients.slice(start, end);

    this.logger.log(`Fetched ${paginatedData.length} patients (page ${page})`);
    return { total, page, limit, data: paginatedData };
  }


  async getMyPatient(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const patientDoc = await this.patientModel.findOne({ user: userObjectId });

    if (!patientDoc || !patientDoc.patients || patientDoc.patients.length === 0) {
      throw new NotFoundException('No patients found for this user');
    }

    return patientDoc.patients.map((p) => {
      const decryptedData = JSON.parse(decryptPHI(p.encryptedData, p.iv, p.tag));

      const age = this.calculateAge(decryptedData.dob);
      return {
        id: p._id?.toString(),
        fhirId: p.fhirId,
        age,
        ...decryptedData,
      };
    })
  }

  async getPatientById(userId: string, patientId: string) {
    const userObjectId = new Types.ObjectId(userId);

    const patientDoc = await this.patientModel.findOne(
      { user: userObjectId, 'patients._id': patientId },
      { 'patients.$': 1 }
    );

    if (!patientDoc || !patientDoc.patients || patientDoc.patients.length === 0) {
      throw new NotFoundException('Patient not found or not authorized');
    }
    const patient = patientDoc.patients[0];
    const decryptedData = JSON.parse(decryptPHI(patient.encryptedData, patient.iv, patient.tag));

    const age = this.calculateAge(decryptedData.dob);

    this.logger.log(`Fetched single patient with ID: ${patientId}, FHIR ID: ${patient.fhirId}`);

    return {
      id: patient._id?.toString(),
      fhirId: patient.fhirId,
      age,
      ...decryptedData,
    };
  }

  async updateDeatils(userId: string, patientId: string, updateDto: UpdatePatientDto) {
    const userObjectId = new Types.ObjectId(userId);

    const patientDoc = await this.patientModel.findOne(
      { user: userObjectId, 'patients._id': patientId },
      { 'patients.$': 1 }
    );

    if (!patientDoc || !patientDoc.patients || patientDoc.patients.length === 0) {
      throw new NotFoundException('Patient not found or not authorized');
    }

    const patient = patientDoc.patients[0];
    const decryptedData = JSON.parse(decryptPHI(patient.encryptedData, patient.iv, patient.tag));

    const mergeDefined = (original: any, updates: any) => {
      if (!updates) return original;
      return Object.keys(updates).reduce((acc, key) => {
        if (updates[key] !== undefined) acc[key] = updates[key];
        return acc;
      }, { ...original });
    };

    const updatedData = {
      ...decryptedData,
      ...updateDto,
      address: mergeDefined(decryptedData.address, updateDto.address),
      emergencyContact: mergeDefined(decryptedData.emergencyContact, updateDto.emergencyContact),

    };

    const { encryptedData, iv, tag } = encryptPHI(JSON.stringify(updatedData));

    await this.patientModel.updateOne(
      { user: userObjectId, 'patients._id': patientId },
      {
        $set: {
          'patients.$.encryptedData': encryptedData,
          'patients.$.iv': iv,
          'patients.$.tag': tag,
        },
      }
    );

    return {
      id: patientId,
      data: updatedData,
    };
  }

  async deletePatients(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    const patientDoc = await this.patientModel.findOne({ user: userObjectId });
    if (!patientDoc) {
      throw new NotFoundException('Patient not found');
    }

    await this.patientModel.deleteOne({ user: userObjectId });

    return { message: 'Patient accounts deleted successfully' };
  }


  async removePatient(userId: string, patientId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const patientObjectId = new Types.ObjectId(patientId);

    const updated = await this.patientModel.findOneAndUpdate(
      { user: userObjectId, 'patients._id': patientObjectId },
      { $pull: { patients: { _id: patientObjectId } } },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException('Patient not found or already deleted');
    }

    return { message: `Patient account ${patientId} removed successfully` };
  }

}