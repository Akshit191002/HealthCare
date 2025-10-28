import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorsService } from './doctor.service';
import { DoctorsController } from './doctor.controller';
import { FhirService } from 'src/common/fhir/fhir.service';
import { Doctor, DoctorSchema } from './doctor.schema';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Doctor.name, schema: DoctorSchema }]),
    AuthModule,
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService, FhirService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
