import { Controller, Post, Body, Get, Param, Req, UseGuards, Patch, Delete, Query } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from 'src/utils/jwt-auth.guard';
import { BloodGroup, Gender, RegisterPatientDto } from './dto/register-patient.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RolesGuard } from 'src/utils/roles.guard';
import { Roles } from 'src/utils/roles.decorator';
import { DoctorsService } from 'src/doctor/doctor.service';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { AddFamilyMemberDto } from './dto/register-family.dto';

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
  @Post('addFamily')
  @ApiOperation({ summary: 'Register a new patient' })
  @ApiResponse({ status: 201, description: 'Patient successfully registered' })
  @ApiResponse({ status: 400, description: 'Validation or Bad Request' })
  async addFamily(@Body() dto: AddFamilyMemberDto, @Req() req) {
    return await this.patientsService.addFamilyMember(dto, req.user.userId);
  }

  @Roles('patient')
  @Get()
  @ApiOperation({ summary: 'Get All Patients with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Patient list retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Internal server error' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination (default is 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of patients per page (default is 10)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search patients by first name or last name' })
  @ApiQuery({ name: 'gender', required: false, enum: Gender, description: 'Filter patients by gender (Male, Female, Other)' })
  @ApiQuery({ name: 'bloodGroup', required: false, enum: BloodGroup, description: 'Filter patients by blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)' })
  @ApiQuery({ name: 'heightFrom', required: false, type: Number, description: 'Filter patients with height greater than or equal to this value (in cm)' })
  @ApiQuery({ name: 'heightTo', required: false, type: Number, description: 'Filter patients with height less than or equal to this value (in cm)' })
  @ApiQuery({ name: 'weightFrom', required: false, type: Number, description: 'Filter patients with weight greater than or equal to this value (in kg)' })
  @ApiQuery({ name: 'weightTo', required: false, type: Number, description: 'Filter patients with weight less than or equal to this value (in kg)' })

  async getAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('gender') gender?: string,
    @Query('bloodGroup') bloodGroup?: string,
    @Query('heightFrom') heightFrom?: number,
    @Query('heightTo') heightTo?: number,
    @Query('weightFrom') weightFrom?: number,
    @Query('weightTo') weightTo?: number,
  ) {
    return await this.patientsService.getAllPatients({
      page, limit, search, gender, bloodGroup, heightFrom, heightTo, weightFrom, weightTo,
    });
  }

  @Roles('patient')
  @Get('me')
  @ApiOperation({ summary: 'Get my patient profile (linked to current user)' })
  @ApiResponse({ status: 200, description: 'Returns the logged-in user patient record' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async getMine(@Req() req) {
    return await this.patientsService.getMyPatient(req.user.userId);
  }

  // @Roles('patient')
  // @Get('doctors')
  // @ApiOperation({ summary: 'Get all doctors' })
  // @ApiResponse({ status: 200, description: 'Doctors list retrieved successfully.' })
  // @ApiResponse({ status: 500, description: 'Internal server error.' })
  // async getAllDoc() {
  //   return await this.doctorsService.getAllDoctors();
  // }

  @Roles('patient')
  @Get(':id')
  @ApiOperation({ summary: 'Get patient by ID (only if belongs to current user)' })
  @ApiResponse({ status: 200, description: 'Patient details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found or unauthorized' })
  async getById(@Param('id') id: string) {
    return await this.patientsService.getPatientById(id);
  }


  @Roles('patient')
  @Patch(':id')
  @ApiOperation({ summary: 'Partial update patient details (only if belongs to current user)' })
  @ApiResponse({ status: 200, description: 'Patient details updated successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found or unauthorized' })
  async updateDetails(@Param('id') patientId: string, @Req() req, @Body() updateDto: UpdatePatientDto) {
    return await this.patientsService.updateDetails(req.user.userId, patientId, updateDto);
  }

  @Roles('patient')
  @Delete()
  @ApiOperation({ summary: 'Soft delete patient accounts for the current user' })
  @ApiResponse({ status: 200, description: 'patient accounts deleted successfully' })
  @ApiResponse({ status: 404, description: 'No patient accounts found to delete' })
  async deleteAllPatients(@Req() req) {
    return await this.patientsService.deletePatients(req.user.userId);
  }

  @Roles('patient')
  @Delete(':id')
  @ApiOperation({ summary: 'Remove patient account for the current user' })
  @ApiResponse({ status: 200, description: 'Patient account deleted successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found or unauthorized' })
  async deletePatient(@Param('id') patientId: string) {
    return await this.patientsService.removePatient(patientId);
  }
}