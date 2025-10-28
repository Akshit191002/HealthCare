import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { FhirService } from '../../common/fhir/fhir.service';
import { Patient, PatientSchema } from 'src/modules/patient/patient.schema';
import { AuthModule } from 'src/modules/auth/auth.module';
import { DoctorsModule } from 'src/modules/doctor/doctor.module';
import { Auth, AuthSchema } from 'src/modules/auth/auth.schema';
import { SquareModule } from 'src/shared/square/square.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Patient.name, schema: PatientSchema }]),
    MongooseModule.forFeature([{ name: Auth.name, schema: AuthSchema }]),
    AuthModule,DoctorsModule,SquareModule
  ],
  providers: [PatientsService, FhirService],
  controllers: [PatientsController],
  exports: [PatientsService],
})
export class PatientsModule {}
