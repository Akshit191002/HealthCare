import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorsService } from './doctor.service';
import { DoctorsController } from './doctor.controller';
import { FhirService } from 'src/fhir/fhir.service';
import { Doctor, DoctorSchema } from './doctor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Doctor.name, schema: DoctorSchema }]),
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService, FhirService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
