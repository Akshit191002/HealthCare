import { Controller, Post, Body, Get, Param, Req, UseGuards, BadRequestException, Query } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/jwt/jwt-auth.guard';
import { Gender, RegisterDoctorDto } from './dto/register-doctor.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DoctorsService } from './doctor.service';
import { Roles } from 'src/common/role/roles.decorator';
import { RolesGuard } from 'src/common/role/roles.guard';

@ApiTags('Doctors')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('doctors')
export class DoctorsController {
    constructor(
        private readonly doctorsService: DoctorsService,
    ) { }

    @Roles('doctor')
    @Post()
    @ApiOperation({ summary: 'Register a new doctor' })
    @ApiResponse({ status: 201, description: 'Doctor registered successfully.' })
    @ApiResponse({ status: 400, description: 'Validation or bad request error.' })
    @ApiResponse({ status: 500, description: 'Internal server error.' })
    async register(@Body() dto: RegisterDoctorDto, @Req() req) {
        try {
            return await this.doctorsService.registerDoctor(dto, req.user.userId);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    @Roles('doctor')
    @Get('me')
    @ApiOperation({ summary: 'Get my doctor profile' })
    @ApiResponse({ status: 200, description: 'Doctor profile retrieved successfully.' })
    @ApiResponse({ status: 404, description: 'Doctor profile not found.' })
    @ApiResponse({ status: 500, description: 'Internal server error.' })
    async getMine(@Req() req) {
        try {
            return await this.doctorsService.getMyAccount(req.user.userId);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    @Roles('patient')
    @Get()
    @ApiOperation({ summary: 'Get all doctors with pagination, search, and filters' })
    @ApiResponse({ status: 200, description: 'Doctors list retrieved successfully.' })
    @ApiResponse({ status: 400, description: 'Bad request.' })
    @ApiResponse({ status: 500, description: 'Internal server error.' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination, default is 1' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of doctors per page, default is 10' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by first name, last name, or specialization' })
    @ApiQuery({ name: 'gender', required: false, enum: Gender, description: 'Filter doctors by gender' })
    @ApiQuery({ name: 'specialization', required: false, type: String, description: 'Filter by doctor specialization' })
    @ApiQuery({ name: 'city', required: false, type: String, description: 'Filter by city' })
    @ApiQuery({ name: 'state', required: false, type: String, description: 'Filter by state' })
    @ApiQuery({ name: 'country', required: false, type: String, description: 'Filter by country' })
    async getAll(
        @Query('page') page: number=1,
        @Query('limit') limit: number=10,
        @Query('search') search?: string,
        @Query('gender') gender?: string,
        @Query('specialization') specialization?: string,
        @Query('city') city?: string,
        @Query('state') state?: string,
        @Query('country') country?: string,
    ) {
        try {
            return await this.doctorsService.getAllDoctors(
                Number(page),
                Number(limit),
                search,
                gender,
                specialization,
                city,
                state,
                country,
            );
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    @Roles('doctor')
    @Get(':id')
    @ApiOperation({ summary: 'Get doctor by ID' })
    @ApiResponse({ status: 200, description: 'Doctor retrieved successfully.' })
    @ApiResponse({ status: 404, description: 'Doctor not found.' })
    @ApiResponse({ status: 500, description: 'Internal server error.' })
    async getById(@Param('id') id: string, @Req() req) {
        try {
            return await this.doctorsService.getDoctorById(id, req.user.userId);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

}