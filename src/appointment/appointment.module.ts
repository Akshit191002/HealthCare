// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { Appointment, AppointmentSchema } from './appointment.schema';
// import { FhirService } from '../fhir/fhir.service';
// import { AppointmentsService } from './appointment.service';
// import { AppointmentsController } from './appointment.controller';
// import { Doctor, DoctorSchema } from 'src/doctor/doctor.schema';
// import { Patient, PatientSchema } from 'src/patient/patient.schema';

// @Module({
//   imports: [
//     MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }]),
//     MongooseModule.forFeature([{ name: Doctor.name, schema: DoctorSchema }]),
//     MongooseModule.forFeature([{ name: Patient.name, schema: PatientSchema }]),
//   ],
//   providers: [AppointmentsService, FhirService],
//   controllers: [AppointmentsController],
//   exports: [AppointmentsService, MongooseModule]
// })
// export class AppointmentsModule { }
