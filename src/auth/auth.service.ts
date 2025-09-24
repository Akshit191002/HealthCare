import { Injectable, ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Auth, AuthDocument } from './auth.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RedisService } from 'src/redis/redis.service';
import { generateOtp } from 'src/utils/otp.util';
import { sendOtpEmail } from 'src/utils/email.util';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';


@Injectable()
export class AuthService {
    constructor(
        @InjectModel(Auth.name) private authModel: Model<AuthDocument>,
        private jwtService: JwtService,
        private readonly redisService: RedisService,
    ) { }

    async register(dto: RegisterDto) {
        const existing = await this.authModel.findOne({ email: dto.email });
        if (existing) throw new ConflictException('Email already exists');

        const otp = generateOtp();

        await this.redisService.set(`otp:${dto.email}`, { otp, password: dto.password, role: dto.role ?? 'patient' }, 300);

        await sendOtpEmail(dto.email, otp);

        return { message: 'OTP sent to your email', email: dto.email };
    }

    async verifyOtp(dto: VerifyOtpDto) {
        const record = await this.redisService.get<{ otp: string; password: string, role: string }>(`otp:${dto.email}`);
        if (!record) throw new BadRequestException('No OTP found or expired');

        if (record.otp !== dto.otp) throw new BadRequestException('Invalid OTP');

        const hashed = await bcrypt.hash(record.password, 10);

        const user = new this.authModel({
            email: dto.email,
            password: hashed,
            role: record.role
        });

        await user.save();

        await this.redisService.del(`otp:${dto.email}`);

        return { message: `${record.role} registered successfully` };
    }

    async login(dto: LoginDto) {
        const user = await this.authModel.findOne({ email: dto.email });
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) throw new UnauthorizedException('Invalid credentials');

        const payload = { sub: user._id, email: user.email, role: user.role };
        const token = await this.jwtService.signAsync(payload);

        return { access_token: token, role: user.role };
    }

    async changePassword(userId: string, dto: ChangePasswordDto) {
        const user = await this.authModel.findById(userId);
        if (!user) throw new UnauthorizedException('User not found');

        const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
        if (!isMatch) throw new BadRequestException('Current password is incorrect');

        const hashed = await bcrypt.hash(dto.newPassword, 10);
        user.password = hashed;
        await user.save();

        return { message: 'Password changed successfully' };
    }

    async forgetPassword(email: string) {
        const user = await this.authModel.findOne({ email });
        if (!user) throw new NotFoundException('User not found');

        const otp = generateOtp();
        await this.redisService.set(`forget:${email}`, { otp, userId: user._id }, 300);

        await sendOtpEmail(email, otp);

        return { message: 'OTP sent to your email' };
    }

    async resetPassword(email: string, otp: string, newPassword: string) {
        const record = await this.redisService.get<{ otp: string; userId: string }>(`forget:${email}`);
        if (!record) throw new BadRequestException('OTP expired or invalid');

        if (record.otp !== otp) throw new BadRequestException('Invalid OTP');

        const user = await this.authModel.findById(record.userId);
        if (!user) throw new NotFoundException('User not found');

        const hashed = await bcrypt.hash(newPassword, 10);
        user.password = hashed;
        await user.save();

        await this.redisService.del(`forget:${email}`);

        return { message: 'Password reset successfully' };
    }
}