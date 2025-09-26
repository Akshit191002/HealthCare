import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FhirService } from '../fhir/fhir.service';
import { encryptPHI, decryptPHI } from '../utils/encryption.util';
import { Patient, PatientDocument } from './patient.schema';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientResponseDto } from './dto/patient-response.dto';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private fhirService: FhirService,
  ) { }

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

  async getAllPatients() {
    const patientDocs = await this.patientModel.find();
    if (!patientDocs || patientDocs.length === 0) {
      throw new NotFoundException('No patients found');
    }

    const decrypted = patientDocs.flatMap((doc) =>
      doc.patients.map((p) => ({
        user: doc.user,
        fhirId: p.fhirId,
        data: JSON.parse(decryptPHI(p.encryptedData, p.iv, p.tag)),
      })),
    );

    this.logger.log(`Fetched ${decrypted.length} patients`);
    return decrypted;
  }

  // async getMyPatient(userId: string) {
  //   const userObjectId = new Types.ObjectId(userId);
  //   const patientDoc = await this.patientModel.findOne({ user: userObjectId });

  //   if (!patientDoc || patientDoc.patients.length === 0) {
  //     throw new NotFoundException('No patients found for this user');
  //   }

  //   return patientDoc.patients.map((p) => ({
  //     id: p._id,
  //     fhirId: p.fhirId,
  //     data: JSON.parse(decryptPHI(p.encryptedData, p.iv, p.tag)),
  //   }));
  // }

  async getMyPatient(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const patientDoc = await this.patientModel.findOne({ user: userObjectId });

    if (!patientDoc || !patientDoc.patients || patientDoc.patients.length === 0) {
      throw new NotFoundException('No patients found for this user');
    }

    return patientDoc.patients.map((p) => {
      const decryptedData = JSON.parse(decryptPHI(p.encryptedData, p.iv, p.tag));

      let age;
      if (decryptedData.dob) {
        const dob = new Date(decryptedData.dob);
        const now = new Date();
        let years = now.getFullYear() - dob.getFullYear();
        age = years
      }
      return {
        id: p._id?.toString(),
        fhirId: p.fhirId,
        age,
        ...decryptedData,
      };
    })
  }

  // async getPatientById(userId: string, patientId: string) {
  //   const userObjectId = new Types.ObjectId(userId);

  //   const patientDoc = await this.patientModel.findOne(
  //     { user: userObjectId, 'patients._id': patientId },
  //     { 'patients.$': 1 }
  //   );

  //   if (!patientDoc || !patientDoc.patients || patientDoc.patients.length === 0) {
  //     throw new NotFoundException('Patient not found or not authorized');
  //   }

  //   const patient = patientDoc.patients[0];
  //   const decryptedData = JSON.parse(decryptPHI(patient.encryptedData, patient.iv, patient.tag));

  //   this.logger.log(`Fetched single patient with ID: ${patientId}, FHIR ID: ${patient.fhirId}`);

  //   return {
  //     id: patient._id,
  //     fhirId: patient.fhirId,
  //     data: decryptedData,
  //   };
  // }

  async getPatientById(userId: string, patientId: string) {
    const userObjectId = new Types.ObjectId(userId);

    const patientDoc = await this.patientModel.findOne(
      { user: userObjectId, 'patients._id': patientId },
      { 'patients.$': 1 }
    );

    if (!patientDoc || !patientDoc.patients || patientDoc.patients.length === 0) {
      throw new NotFoundException('Patient not found or not authorized');
    }
    let age;
    const patient = patientDoc.patients[0];
    const decryptedData = JSON.parse(decryptPHI(patient.encryptedData, patient.iv, patient.tag));

    const dob = new Date(decryptedData.dob);
    const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();

    age = years

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
}