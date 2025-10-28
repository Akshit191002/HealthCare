import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FhirService } from '../../common/fhir/fhir.service';
import { encryptPHI, decryptPHI } from '../../common/encryption/encryption.util';
import { Patient, PatientDocument, PatientRole, Status } from './patient.schema';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Auth, AuthDocument, Role } from 'src/modules/auth/auth.schema';
import { AddFamilyMemberDto } from './dto/register-family.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { sendEmail } from 'src/shared/email/email.util';
import { SquareService } from 'src/shared/square/square.service';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    @InjectModel(Auth.name) private authModel: Model<AuthDocument>,
    private readonly squareService: SquareService,
    private fhirService: FhirService,
  ) { }

  private async defaultPassword(): Promise<{ plain: string; hashed: string }> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!';
    const randomBytes = crypto.randomBytes(10);
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars[randomBytes[i] % chars.length];
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    return { plain: password, hashed: hashedPassword }
  }

  private calculateAge(dob: string): number {
    if (!dob) return 0;
    const birth = new Date(dob);
    const now = new Date();
    return now.getFullYear() - birth.getFullYear();
  }

  async registerPatient(data: RegisterPatientDto, userId: string) {
    if (!data?.firstName || !data?.lastName || !data?.dob || !data?.gender || !data?.email) {
      throw new BadRequestException('Invalid patient data. All fields are required.');
    }
    const userObjectId = new Types.ObjectId(userId);

    const user = await this.authModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.email !== data.email) {
      throw new BadRequestException('Email does not match the authenticated user');
    }

    const existingPatient = await this.patientModel.findOne({ user: userObjectId });
    if (existingPatient) {
      throw new BadRequestException('Patient account already exists for this user');
    }

    const { encryptedData, iv, tag } = encryptPHI(JSON.stringify(data));

    const fhirId = await this.fhirService.createPatient(data);

    const role = PatientRole.SELF;
    const patient = new this.patientModel({
      user: userObjectId,
      encryptedData,
      iv,
      tag,
      fhirId,
      role,
      status: Status.ACCEPT
    });

    await patient.save();

    this.logger.log(`Patient added for user ${userId} with FHIR ID: ${fhirId}`);

    try {
      const squareCustomer = await this.squareService.createCustomer({
        email: data.email,
        givenName: data.firstName,
        familyName: data.lastName,
        birthday: data.dob,
      });

      let card;
      if (squareCustomer && squareCustomer.id) {
        patient.squareCustomerId = squareCustomer.id;

        card = await this.squareService.createCard(
          squareCustomer.id,
          data.cardNonce,
          `${data.firstName} ${data.lastName}`
        );
        if (card && card.id) {
          patient.cardId = card.id;
        }
      }

      await patient.save();

      const amount = data.plan === 'monthly' ? 10000 : 100000;
      if (squareCustomer?.id && card?.id) {
        await this.squareService.chargeProrated(
          squareCustomer.id,
          card.id,
          amount,
          `Initial ${data.plan} subscription`
        );
      }
    } catch (err) {
      this.logger.error('Square integration failed: ' + err.message);
    }

    return { id: patient._id, fhirId, role };
  }

  async addFamilyMember(data: AddFamilyMemberDto, userId: string) {
    if (!data?.firstName || !data?.lastName || !data?.dob || !data?.gender || !data?.email || !data?.relationship) {
      throw new BadRequestException('Invalid patient data. All fields are required.');
    }
    const userObjectId = new Types.ObjectId(userId);

    const user = await this.authModel.findById(userObjectId);
    if (!user) throw new NotFoundException('User not found');

    const existingUser = await this.authModel.findOne({ email: data.email });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const defaultPassword = await this.defaultPassword()

    const account = new this.authModel({
      email: data.email,
      password: defaultPassword.hashed,
      role: Role.PATIENT,
      isVerified: false,
      mustChangePassword: true,
    });
    await account.save();

    const { encryptedData, iv, tag } = encryptPHI(JSON.stringify(data));

    const fhirId = await this.fhirService.createPatient(data);

    const parentpatient = await this.patientModel.findOne({ user: userObjectId });
    if (!parentpatient) throw new NotFoundException('Parentpatient not found');

    const role = PatientRole.FAMILY;
    const patient = new this.patientModel({
      user: account._id,
      parentId: parentpatient._id,
      encryptedData,
      iv,
      tag,
      fhirId,
      role,
      status: Status.PENDING
    });
    await patient.save();

    this.logger.log(`Patient added for user ${userId} with FHIR ID: ${fhirId}`);
    await sendEmail({
      to: data.email,
      subject: 'Your Family Member Account Created',
      text: `Hello ${data.firstName},\n\nYour family member account has been created.\n\nLogin Email: ${data.email}\nTemporary Password: ${defaultPassword.plain}\n\nPlease log in and change your password immediately.\n\nThanks,\nHealthcare Team`,
    });

    return { message: 'Family member add successfully' };
  }

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
    const patientDocs = await this.patientModel.find({ status: Status.ACCEPT });
    if (!patientDocs || patientDocs.length === 0) return { total: 0, data: [] };

    let patients = patientDocs.map((p) => {
      const data = JSON.parse(decryptPHI(p.encryptedData, p.iv, p.tag));
      return {
        id: p._id.toString(),
        user: p.user,
        fhirId: p.fhirId,
        role: p.role,
        ...data,
      };
    });

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

    const patientDocs = await this.patientModel.find({ user: userObjectId });

    if (!patientDocs || patientDocs.length === 0) {
      throw new NotFoundException('No patients found for this user');
    }

    return patientDocs.map((p) => {
      const decryptedData = JSON.parse(decryptPHI(p.encryptedData, p.iv, p.tag));
      const age = this.calculateAge(decryptedData.dob);

      return {
        id: p._id.toString(),
        fhirId: p.fhirId,
        role: p.role,
        age,
        ...decryptedData,
      };
    });
  }

  async getPatientById(patientId: string) {
    const patientDoc = await this.patientModel.findOne({
      _id: patientId,
    });

    if (!patientDoc) {
      throw new NotFoundException('Patient not found or not authorized');
    }
    const decryptedData = JSON.parse(decryptPHI(patientDoc.encryptedData, patientDoc.iv, patientDoc.tag));

    const age = this.calculateAge(decryptedData.dob);

    this.logger.log(`Fetched single patient with ID: ${patientId}, FHIR ID: ${patientDoc.fhirId}`);

    return {
      id: patientDoc._id.toString(),
      fhirId: patientDoc.fhirId,
      role: patientDoc.role,
      age,
      ...decryptedData,
    };
  }

  async updateDetails(userId: string, patientId: string, updateDto: UpdatePatientDto) {
    const userObjectId = new Types.ObjectId(userId);

    const patientDoc = await this.patientModel.findOne({ _id: patientId, user: userObjectId });
    if (!patientDoc) {
      throw new NotFoundException('Patient not found or not authorized');
    }

    const decryptedData = JSON.parse(decryptPHI(patientDoc.encryptedData, patientDoc.iv, patientDoc.tag));

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

    patientDoc.encryptedData = encryptedData;
    patientDoc.iv = iv;
    patientDoc.tag = tag;
    await patientDoc.save();

    return {
      id: patientId,
      data: updatedData,
    };
  }

  async deletePatients(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    const count = await this.patientModel.countDocuments({ user: userObjectId });
    if (count === 0) {
      throw new NotFoundException('No patient accounts found for this user');
    }

    await this.patientModel.deleteMany({ user: userObjectId });

    return { message: 'Patient accounts deleted successfully' };
  }

  async removePatient(patientId: string) {
    const patientObjectId = new Types.ObjectId(patientId);

    const result = await this.patientModel.deleteOne({
      _id: patientObjectId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Patient not found or already deleted');
    }

    return { message: `Patient account ${patientId} removed successfully` };
  }

}