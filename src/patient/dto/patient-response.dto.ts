import { ApiProperty } from '@nestjs/swagger';
import { RegisterPatientDto } from './register-patient.dto';

export class PatientResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fhirId: string;

  @ApiProperty({ type: RegisterPatientDto })
  data: RegisterPatientDto & { age?: number };
}
