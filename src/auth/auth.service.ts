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
        await this.redisService.rateLimit(`otp_limit:${dto.email}`, 3, 900,
            new BadRequestException('Too many OTP requests. Please try again after 15 minutes.')
        );
        const existing = await this.authModel.findOne({ email: dto.email });
        if (existing) throw new ConflictException('Email already exists');

        const otp = generateOtp();

        const hashed = await bcrypt.hash(dto.password, 10);
        await this.redisService.set(`otp:${dto.email}`, { otp, password: hashed, role: dto.role ?? 'patient' }, 300);

        await sendOtpEmail(dto.email, otp);

        return { message: 'OTP sent to your email', email: dto.email };
    }

    async verifyOtp(dto: VerifyOtpDto) {
        const record = await this.redisService.get<{ otp: string; password: string; role: string; attempts?: number }>(
            `otp:${dto.email}`
        );

        if (!record) throw new BadRequestException('No OTP found or expired');

        const attempts = record.attempts ?? 0;

        if (record.otp !== dto.otp) {
            const newAttempts = attempts + 1;

            if (newAttempts >= 3) {
                await this.redisService.del(`otp:${dto.email}`);
                throw new BadRequestException('Too many invalid attempts. OTP expired.');
            }

            await this.redisService.set(
                `otp:${dto.email}`,
                { ...record, attempts: newAttempts },
                300
            );

            throw new BadRequestException(`Invalid OTP. Attempts left: ${3 - newAttempts}`);
        }

        const user = new this.authModel({
            email: dto.email,
            password: record.password,
            role: record.role,
        });

        await user.save();
        await this.redisService.del(`otp:${dto.email}`);

        return { message: `${record.role} registered successfully` };
    }


    async login(dto: LoginDto) {
        const user = await this.authModel.findOne({ email: dto.email });
        if (!user) {
            await this.redisService.rateLimit(`login_limit:${dto.email}`, 3, 24 * 60 * 60,
                new UnauthorizedException('Too many login request. Please try again after 24 hours.')
            );
            throw new UnauthorizedException('Invalid credentials')
        };

        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) {
            await this.redisService.rateLimit(`login_limit:${dto.email}`, 3, 24 * 60 * 60,
                new UnauthorizedException('Too many login request. Please try again after 24 hours.')
            );
            throw new UnauthorizedException('Invalid credentials')
        };

        await this.redisService.del(`login_limit:${dto.email}`);
        const payload = { sub: user._id, email: user.email, role: user.role };
        const accessToken = await this.jwtService.signAsync(payload);
        const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

        await this.redisService.set(`refresh_token:${user._id}`, refreshToken, 7 * 24 * 60 * 60);

        return { access_token: accessToken, refresh_token: refreshToken, role: user.role };
    }

    async refreshToken(userId: string, token: string) {
        const storedToken = await this.redisService.get(`refresh_token:${userId}`);
        if (!storedToken || storedToken !== token) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const user = await this.authModel.findById(userId);
        if (!user) throw new UnauthorizedException('User not found');

        const payload = { sub: user._id, email: user.email, role: user.role };
        const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
        const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

        await this.redisService.set(`refresh_token:${user._id}`, refreshToken, 7 * 24 * 60 * 60);

        return { access_token: accessToken, refresh_token: refreshToken };
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
        await this.redisService.rateLimit(`otp_limit:${email}`, 3, 900,
            new BadRequestException('Too many OTP requests. Please try again after 15 minutes.')
        );
        const user = await this.authModel.findOne({ email });
        if (!user) throw new BadRequestException('Invalid email');

        const otp = generateOtp();
        await this.redisService.set(`forget:${email}`, { otp, userId: user._id }, 300);

        await sendOtpEmail(email, otp);

        return { message: 'OTP sent to your email' };
    }

    async resetPassword(email: string, otp: string, newPassword: string) {
        const record = await this.redisService.get<{ otp: string; userId: string; attempts?: number }>(
            `forget:${email}`
        );
        if (!record) throw new BadRequestException('OTP expired or invalid');

        const attempts = record.attempts ?? 0;

        if (record.otp !== otp) {
            const newAttempts = attempts + 1;

            if (newAttempts >= 3) {
                await this.redisService.del(`forget:${email}`);
                throw new BadRequestException('Too many invalid attempts. OTP expired.');
            }

            await this.redisService.set(
                `forget:${email}`,
                { ...record, attempts: newAttempts },
                300
            );

            throw new BadRequestException(`Invalid OTP. Attempts left: ${3 - newAttempts}`);
        }

        const user = await this.authModel.findById(record.userId);
        if (!user) throw new NotFoundException('User not found');

        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            throw new BadRequestException('New password cannot be the same as the old password');
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        user.password = hashed;
        await user.save();

        await this.redisService.del(`forget:${email}`);

        return { message: 'Password reset successfully' };
    }

    async logout(userId: string, accessToken: string) {
        await this.redisService.del(`refresh_token:${userId}`);
        // const decoded: any = this.jwtService.decode(accessToken);
        // if (decoded && decoded.exp) {
        //     const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        //     if (ttl > 0) {
        //         await this.redisService.set(`blacklist_token:${accessToken}`, 'logout', ttl);
        //     }
        // }
        return { message: 'Logged out successfully' };
    }

}