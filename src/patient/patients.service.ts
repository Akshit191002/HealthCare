import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FhirService } from '../fhir/fhir.service';
import { encryptPHI, decryptPHI } from '../utils/encryption.util';
import { Patient, PatientDocument } from './patient.schema';
import { RegisterPatientDto } from './dto/register-patient.dto';

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

    const existingPatient = await this.patientModel.findOne({ user: userId });
    if (existingPatient) {
      throw new BadRequestException('Patient profile already exists for this account');
    }

    const { encryptedData, iv, tag } = encryptPHI(JSON.stringify(data));

    const fhirId = await this.fhirService.createPatient(data);

    const patient = new this.patientModel({
      encryptedData,
      iv,
      tag,
      fhirId,
      user: userId,
    });

    await patient.save();

    this.logger.log(`Patient saved locally with FHIR ID: ${fhirId}`);
    return { id: patient._id, fhirId };
  }


  async getPatient() {
    const patients = await this.patientModel.find();
    if (!patients || patients.length === 0) {
      throw new NotFoundException('No patients found');
    }

    const decryptedPatients = patients.map((p) => {
      const decryptedData = JSON.parse(
        decryptPHI(p.encryptedData, p.iv, p.tag),
      );
      return {
        id: p._id,
        fhirId: p.fhirId,
        localData: decryptedData,
      };
    });

    this.logger.log(`Fetched ${decryptedPatients.length} patients`);
    return decryptedPatients;
  }


  async getPatientById(id: string, userId: string) {
    const patient = await this.patientModel.findOne({ _id: id, user: userId }); // 👈 ensure ownership
    if (!patient) throw new Error('Patient not found or not authorized');

    const decryptedData = JSON.parse(decryptPHI(patient.encryptedData, patient.iv, patient.tag));

    this.logger.log(`Fetched patient from FHIR with ID: ${patient.fhirId}`);
    return { decryptedData };
  }


  async getMyPatient(userId: string) {
    const patient = await this.patientModel.findOne({ user: userId });
    if (!patient) {
      throw new NotFoundException('Patient not found for this user');
    }

    const decryptedData = JSON.parse(decryptPHI(patient.encryptedData, patient.iv, patient.tag));

    return {
      id: patient._id,
      fhirId: patient.fhirId,
      localData: decryptedData,
    };
  }

  async getAllDoctor() { }

}
