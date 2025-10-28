import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { AuthModule } from '../auth/auth.module';
import { Doctor, DoctorSchema } from 'src/modules/doctor/doctor.schema';
import { Patient, PatientSchema } from 'src/modules/patient/patient.schema';
import { Appointment, AppointmentSchema } from './appointment.schema';
import { Auth, AuthSchema } from 'src/modules/auth/auth.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Doctor.name, schema: DoctorSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: Auth.name, schema: AuthSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
