import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { FhirService } from '../fhir/fhir.service';
import { Patient, PatientSchema } from 'src/patient/patient.schema';
import { AuthModule } from 'src/auth/auth.module';
import { DoctorsModule } from 'src/doctor/doctor.module';
import { Auth, AuthSchema } from 'src/auth/auth.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Patient.name, schema: PatientSchema }]),
    MongooseModule.forFeature([{ name: Auth.name, schema: AuthSchema }]),
    AuthModule,DoctorsModule,
  ],
  providers: [PatientsService, FhirService],
  controllers: [PatientsController],
  exports: [PatientsService],
})
export class PatientsModule {}
