import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PatientsModule } from './patient/patients.module';
import { AuthModule } from './auth/auth.module';
import { DoctorsModule } from './doctor/doctor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    
    MongooseModule.forRoot(process.env.MONGO_URI as string),
    PatientsModule,AuthModule,DoctorsModule
  ],
})
export class AppModule { }