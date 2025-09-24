import { Controller, Post, Body, Get, Param, Req, UseGuards } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from 'src/utils/jwt-auth.guard';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RolesGuard } from 'src/utils/roles.guard';
import { Roles } from 'src/utils/roles.decorator';

@ApiTags('Patients')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) { }

  @Roles('patient')
  @Post()
  @ApiOperation({ summary: 'Register a new patient' })
  @ApiResponse({ status: 201, description: 'Patient successfully registered' })
  @ApiResponse({ status: 400, description: 'Validation or Bad Request' })
  register(@Body() dto: RegisterPatientDto, @Req() req) {
    return this.patientsService.registerPatient(dto, req.user.userId);
  }

  @Roles('patient')
  @Get('me')
  @ApiOperation({ summary: 'Get my patient profile (linked to current user)' })
  @ApiResponse({ status: 200, description: 'Returns the logged-in user patient record' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  getMine(@Req() req) {
    return this.patientsService.getMyPatient(req.user.userId);
  }

  @Roles('patient')
  @Get(':id')
  @ApiOperation({ summary: 'Get patient by ID (only if belongs to current user)' })
  @ApiResponse({ status: 200, description: 'Patient details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found or unauthorized' })
  getById(@Param('id') id: string, @Req() req) {
    return this.patientsService.getPatientById(id, req.user.userId);
  }
}
