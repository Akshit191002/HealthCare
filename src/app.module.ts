import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PatientsModule } from './patient/patients.module';
import { AuthModule } from './auth/auth.module';
import { DoctorsModule } from './doctor/doctor.module';
import { AppointmentModule } from './appointment/appointment.module';
// import { AppointmentsModule } from './appointment/appointment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),

    MongooseModule.forRoot(process.env.MONGO_URI as string),
    AuthModule, PatientsModule, DoctorsModule, AppointmentModule
  ],
})
export class AppModule { }