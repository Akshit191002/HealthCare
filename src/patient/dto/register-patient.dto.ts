import { IsString, IsDateString, ValidateNested, IsNumber, IsOptional, IsEnum, Matches, Min, Max, MinLength, registerDecorator, ValidationOptions, ValidationArguments, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export function IsPastDateWithAge(validationOptions?: ValidationOptions, maxAge = 120) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPastDateWithAge',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return false;

          const date = new Date(value);
          const now = new Date();

          if (date >= now) return false;

          const age = now.getFullYear() - date.getFullYear();
          if (age < 0 || age > maxAge) return false;

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a past date and age must be between 0 and ${maxAge} years`;
        },
      },
    });
  };
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other',
}

export enum BloodGroup {
  A_POS = 'A+',
  A_NEG = 'A-',
  B_POS = 'B+',
  B_NEG = 'B-',
  AB_POS = 'AB+',
  AB_NEG = 'AB-',
  O_POS = 'O+',
  O_NEG = 'O-',
}

class EmergencyContact {
  @ApiProperty({ example: 'Jane Doe', description: 'Emergency contact name', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'Name can contain only letters and space' })
  name?: string;

  @ApiProperty({ example: '9876543210', description: 'Emergency contact phone number', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+\d{1,3}\s?\d{10}$/, {
    message: 'Phone number must include country code and exactly 10 digits for the number part, optionally separated by a space'
  })
  phone?: string;


  @ApiProperty({ example: 'Mother', description: 'Relationship with the patient', required: false })
  @IsOptional()
  @IsString()
  relationship?: string;
}

class Address {
  @ApiProperty({ example: '123 Main St', description: 'Street address of the patient', required: false })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({ example: 'Noida', description: 'City of the patient', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Uttarpradesh', description: 'State of the patient', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: '201309', description: 'Postal/ZIP code of the patient', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5,6}$/, { message: 'Postal code must be 5-6 digits' })
  postalCode?: string;

  @ApiProperty({ example: 'India', description: 'Country of the patient', required: false })
  @IsOptional()
  @IsString()
  country?: string;
}

export class RegisterPatientDto {
  @ApiProperty({ example: 'John', description: 'First name of the patient' })
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'First name can contain only letters' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the patient' })
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'Last name can contain only letters' })
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email of the patient' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({ example: '1990-05-15', description: 'Date of birth (ISO 8601 format)' })
  @IsDateString()
  @IsPastDateWithAge({ message: 'Date of birth must be a past date' })
  dob: string;

  @ApiProperty({ example: 'Male', enum: Gender, description: 'Gender of the patient' })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: 'A+', enum: BloodGroup, description: 'Blood group of the patient', required: false })
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;

  @ApiProperty({ example: '+91 9876543210', description: 'Full phone number with country code', required: false })
  @IsString()
  @Matches(/^\+\d{1,3}\s?\d{10}$/, {
    message: 'Phone number must include country code and exactly 10 digits for the number part, optionally separated by a space'
  })
  phone?: string;

  @ApiProperty({ example: 175.8, description: 'Height of the patient in cm', required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 }, { message: 'Height can have at most 1 decimal place' })
  @Min(30, { message: 'Height must be at least 30 cm' })
  @Max(300, { message: 'Height must be less than 300 cm' })
  height?: number;

  @ApiProperty({ example: 75.5, description: 'Weight of the patient in kg', required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 }, { message: 'Weight can have at most 1 decimal place' })
  @Min(2, { message: 'Weight must be at least 2 kg' })
  @Max(500, { message: 'Weight must be less than 300 kg' })
  weight?: number;

  @ApiProperty({ type: Address, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => Address)
  address?: Address;

  @ApiProperty({ type: EmergencyContact, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContact)
  emergencyContact?: EmergencyContact;
}