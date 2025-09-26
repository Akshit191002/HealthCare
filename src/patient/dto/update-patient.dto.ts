import { PartialType } from '@nestjs/swagger';
import { RegisterPatientDto } from './register-patient.dto';

export class UpdatePatientDto extends PartialType(RegisterPatientDto) {}
