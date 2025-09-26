import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorsService } from './doctor.service';
import { DoctorsController } from './doctor.controller';
import { FhirService } from 'src/fhir/fhir.service';
import { Doctor, DoctorSchema } from './doctor.schema';
import { AuthModule } from 'src/auth/auth.module';
import { AppointmentsModule } from 'src/appointment/appointment.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Doctor.name, schema: DoctorSchema }]),
    AuthModule,AppointmentsModule
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService, FhirService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
