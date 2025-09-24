import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from './appointment.schema';
import { PatientsModule } from '../patient/patients.module';
import { DoctorsModule } from '../doctor/doctor.module';
import { FhirService } from '../fhir/fhir.service';
import { AppointmentsService } from './appointment.service';
import { AppointmentsController } from './appointment.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }]),
    PatientsModule,
    DoctorsModule,
  ],
  providers: [AppointmentsService, FhirService],
  controllers: [AppointmentsController],
  exports: [AppointmentsService]
})
export class AppointmentsModule { }
