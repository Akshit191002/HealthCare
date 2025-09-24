import { Controller, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from 'src/utils/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { Roles } from 'src/utils/roles.decorator';
import { RolesGuard } from 'src/utils/roles.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user and send OTP' })
  @ApiResponse({ status: 201, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request / Email already exists' })
  async register(@Body() dto: RegisterDto) {
    try {
      return await this.authService.register(dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and create user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or expired' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    try {
      return await this.authService.verifyOtp(dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user and return JWT token' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    try {
      return await this.authService.login(dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password incorrect' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    try {
      return await this.authService.changePassword(req.user.userId, dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('forget-password')
  @ApiOperation({ summary: 'Request OTP to reset password' })
  @ApiResponse({ status: 201, description: 'OTP sent to your email' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async forgetPassword(@Body() dto: ForgetPasswordDto) {
    try {
      return await this.authService.forgetPassword(dto.email);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiResponse({ status: 201, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request / Invalid OTP' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      return await this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}