import { Controller, Post, Body, Get, Param, Req, UseGuards, Patch } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from 'src/utils/jwt-auth.guard';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RolesGuard } from 'src/utils/roles.guard';
import { Roles } from 'src/utils/roles.decorator';
import { DoctorsService } from 'src/doctor/doctor.service';
import { UpdatePatientDto } from './dto/update-patient.dto';

@ApiTags('Patients')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly doctorsService: DoctorsService,
  ) { }

  @Roles('patient')
  @Post()
  @ApiOperation({ summary: 'Register a new patient' })
  @ApiResponse({ status: 201, description: 'Patient successfully registered' })
  @ApiResponse({ status: 400, description: 'Validation or Bad Request' })
  async register(@Body() dto: RegisterPatientDto, @Req() req) {
    return await this.patientsService.registerPatient(dto, req.user.userId);
  }

  @Roles('patient')
  @Get()
  @ApiOperation({ summary: 'Get All Patient' })
  @ApiResponse({ status: 201, description: 'Patient list retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Internal server error' })
  async getAll() {
    return await this.patientsService.getAllPatients();
  }

  @Roles('patient')
  @Get('me')
  @ApiOperation({ summary: 'Get my patient profile (linked to current user)' })
  @ApiResponse({ status: 200, description: 'Returns the logged-in user patient record' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async getMine(@Req() req) {
    return await this.patientsService.getMyPatient(req.user.userId);
  }

  @Roles('patient')
  @Get('doctors')
  @ApiOperation({ summary: 'Get all doctors' })
  @ApiResponse({ status: 200, description: 'Doctors list retrieved successfully.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getAllDoc() {
    return await this.doctorsService.getAllDoctors();
  }

  @Roles('patient')
  @Get(':id')
  @ApiOperation({ summary: 'Get patient by ID (only if belongs to current user)' })
  @ApiResponse({ status: 200, description: 'Patient details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found or unauthorized' })
  async getById(@Param('id') id: string, @Req() req) {
    return await this.patientsService.getPatientById(req.user.userId, id);
  }


  @Roles('patient')
  @Patch(':id')
  @ApiOperation({ summary: 'Partial update patient details (only if belongs to current user)' })
  @ApiResponse({ status: 200, description: 'Patient details updated successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found or unauthorized' })
  async updateDetails(@Param('id') patientId: string, @Req() req,@Body() updateDto: UpdatePatientDto) {
    return await this.patientsService.updateDeatils(req.user.userId, patientId, updateDto);
  }
}