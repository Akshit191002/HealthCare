import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PatientsModule } from './modules/patient/patients.module';
import { AuthModule } from './modules/auth/auth.module';
import { DoctorsModule } from './modules/doctor/doctor.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { SquareModule } from './shared/square/square.module';
import { SquareWebhookModule } from './shared/webhook/webhook.module';
import { SpikeModule } from './shared/spike/spike.module';
import { GoogleModule } from './shared/googleCalendar/calendar.module';
import { EpicModule } from './shared/epic/epic.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),

    MongooseModule.forRoot(process.env.MONGO_URI as string),
    EpicModule
    // EpicModule,AuthModule, PatientsModule, SquareModule, SquareWebhookModule, DoctorsModule, SpikeModule, AppointmentModule,GoogleModule
  ],
})
export class AppModule { }