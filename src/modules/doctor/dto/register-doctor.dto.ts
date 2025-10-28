import { IsString, IsDateString, IsOptional, Matches, IsEnum, ValidateNested, MaxLength, MinLength, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other',
}

class Address {
  @ApiProperty({ example: '123 Main St', description: 'Street address of the doctor', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Street address is too long' })
  street?: string;

  @ApiProperty({ example: 'Noida', description: 'City of the doctor', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'City name is too long' })
  city?: string;

  @ApiProperty({ example: 'Uttar Pradesh', description: 'State of the doctor', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'State name is too long' })
  state?: string;

  @ApiProperty({ example: '201309', description: 'Postal/ZIP code of the doctor', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5,6}$/, { message: 'Postal code must be 5–6 digits' })
  postalCode?: string;

  @ApiProperty({ example: 'India', description: 'Country of the doctor', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Country name is too long' })
  country?: string;
}

export class RegisterDoctorDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(30, { message: 'First name must be at most 30 characters long' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(30, { message: 'Last name must be at most 30 characters long' })
  lastName: string;

  @ApiProperty({ example: 'Male', enum: Gender, description: 'Gender of the doctor' })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: '+91 9876543210', description: 'Full phone number with country code' })
  @IsString()
  @Matches(/^\+\d{1,3}\s?\d{10}$/, {
    message: 'Phone number must include country code and exactly 10 digits for the number part',
  })
  phone: string;

  @ApiProperty({ type: Address, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => Address)
  address?: Address;

  @ApiProperty({ example: 'Cardiologist', description: 'Doctor’s specialization' })
  @IsString()
  @MinLength(3, { message: 'Specialization must be at least 3 characters long' })
  @MaxLength(50, { message: 'Specialization must be at most 50 characters long' })
  specialization: string;

  @ApiProperty({ example: 'DOC12345', description: 'Medical license number (alphanumeric)' })
  @IsString()
  @Matches(/^[A-Z]{3}\d{3,12}$/, {
    message: 'License number must start with 3 uppercase letters followed by 3–12 digits',
  })
  licenseNumber: string;

  @ApiProperty({ example: 500, description: 'Consultation fee of the doctor in INR' })
  @IsNumber({}, { message: 'Fee must be a number' })
  @Min(0, { message: 'Fee cannot be negative' })
  fee: number;
}
