import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { FhirService } from '../fhir/fhir.service';
import { Patient, PatientSchema } from 'src/patient/patient.schema';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Patient.name, schema: PatientSchema }]),
    AuthModule
  ],
  providers: [PatientsService, FhirService],
  controllers: [PatientsController],
})
export class PatientsModule {}
