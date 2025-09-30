import { Injectable, ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Auth, AuthDocument, Role } from './auth.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RedisService } from 'src/redis/redis.service';
import { generateOtp } from 'src/utils/otp.util';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { sendEmail } from 'src/utils/email.util';
import { SetMPINDto } from './dto/set-mpin.dto';
import { UpdateMPINDto } from './dto/update-mpin.dto';
import { Patient, PatientDocument, Status } from 'src/patient/patient.schema';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(Auth.name) private authModel: Model<AuthDocument>,
        @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
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

        await sendEmail({
            to: dto.email,
            subject: 'Your OTP Code',
            text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`,
        });

        return { message: 'OTP sent to your email', email: dto.email };
    }

    async verifyOtp(dto: VerifyOtpDto) {
        const record = await this.redisService.get<{ otp: string; password: string; role: string; attempts?: number }>(
            `mustChangePassword: true, otp:${dto.email}`
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
            isVerified: true
        });

        await user.save();
        await this.redisService.del(`otp:${dto.email}`);

        const payload = { sub: user._id, email: user.email, role: user.role };
        const accessToken = await this.jwtService.signAsync(payload);
        const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

        await this.redisService.set(`refresh_token:${user._id}`, refreshToken, 7 * 24 * 60 * 60);

        return {
            message: `${user.role} registered successfully`,
            access_token: accessToken,
            refresh_token: refreshToken,
            role: user.role,
        };
    }

    async login(dto: LoginDto) {
        const user = await this.authModel.findOne({ email: dto.email });
        if (!user) {
            await this.redisService.rateLimit(`login_limit:${dto.email}`, 3, 24 * 60 * 60,
                new UnauthorizedException('Too many login request. Please try again after 24 hours.')
            );
            throw new UnauthorizedException('Invalid credentials')
        };
        if (!user.isVerified) {
            throw new BadRequestException('Your email is not verified')
        };

        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) {
            await this.redisService.rateLimit(`login_limit:${dto.email}`, 3, 24 * 60 * 60,
                new UnauthorizedException('Too many login request. Please try again after 24 hours.')
            );
            throw new UnauthorizedException('Invalid credentials')
        };

        const payload = { sub: user._id, email: user.email, role: user.role };
        const accessToken = await this.jwtService.signAsync(payload);
        const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

        if (user.mustChangePassword) {
            if (user.role === Role.PATIENT) {
                await this.patientModel.updateMany(
                    { user: user._id, status: Status.PENDING },
                    { $set: { status: Status.ACCEPT } }
                );
            }
            return {
                message: 'Login successful but you must change your password',
                access_token: accessToken,
            };
        }

        await this.redisService.del(`login_limit:${dto.email}`);
        await this.redisService.set(`refresh_token:${user._id}`, refreshToken, 7 * 24 * 60 * 60);

        return {
            message: `${user.role} logged in successfully`,
            access_token: accessToken,
            refresh_token: refreshToken,
            role: user.role
        };
    }

    async setMpin(userId: string, dto: SetMPINDto) {
        const user = await this.authModel.findById(userId);
        if (!user) throw new BadRequestException('User not found');

        if (user.mpin) {
            throw new BadRequestException('MPIN is already set for this user');
        }

        if (dto.createMpin !== dto.confirmMpin) {
            throw new BadRequestException('MPIN and Confirm MPIN do not match');
        }

        const hashedMpin = await bcrypt.hash(dto.createMpin, 10);
        await this.authModel.findByIdAndUpdate(userId, { mpin: hashedMpin });

        const payload = { sub: user._id, email: user.email, role: user.role };
        const token = this.jwtService.sign(payload);

        return { accessToken: token };
    }

    async loginMpin(userId: string, mpin: string) {
        const user = await this.authModel.findById(userId);
        if (!user?.mpin) throw new BadRequestException('MPIN not set');

        const key = `login_mpin_limit:${userId}`;

        const isValid = await bcrypt.compare(mpin, user.mpin);
        if (!isValid) {
            await this.redisService.rateLimit(key, 3, 24 * 60 * 60,
                new UnauthorizedException('Too many MPIN attempts. Please try again after 24 hours.')
            );
            throw new UnauthorizedException('Invalid MPIN');
        }

        await this.redisService.del(key);
        const payload = { sub: user._id, email: user.email, role: user.role };
        const token = this.jwtService.sign(payload);

        return {
            message: `${user.role} logged in successfully via MPIN`,
            accessToken: token,
            role: user.role,
        };
    }

    async changeMpin(userId: string, dto: UpdateMPINDto) {
        const user = await this.authModel.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        if (dto.newMpin !== dto.confirmMpin) {
            throw new BadRequestException('MPIN and Confirm MPIN do not match');
        }
        const hashedMpin = await bcrypt.hash(dto.newMpin, 10);

        await this.authModel.findByIdAndUpdate(userId, { mpin: hashedMpin });
        return { message: 'MPIN changed successfully' };
    }

    async forgetMpin(email: string) {
        await this.redisService.rateLimit(`otp_limit:${email}`, 3, 900,
            new BadRequestException('Too many OTP requests. Please try again after 15 minutes.')
        );
        const user = await this.authModel.findOne({ email });
        if (!user) throw new BadRequestException('User not found');

        const otp = generateOtp();
        await this.redisService.set(`forgetMpin:${user.email}`, { otp, userid: user._id }, 300);

        await sendEmail({
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`,
        });
        return { message: 'OTP send to your email' }
    }

    async resetMpin(email: string, otp: string, newMpin: string) {
        const record = await this.redisService.get<{ otp: string; userId: string; attempts?: number }>(
            `forgetMpin:${email}`
        );
        if (!record) throw new BadRequestException('OTP expired or invalid');

        const attempts = record.attempts ?? 0;

        if (record.otp !== otp) {
            const newAttempts = attempts + 1;

            if (newAttempts >= 3) {
                await this.redisService.del(`forgetMpin:${email}`);
                throw new BadRequestException('Too many invalid attempts. OTP expired.');
            }

            await this.redisService.set(
                `forgetMpin:${email}`,
                { ...record, attempts: newAttempts },
                300
            );

            throw new BadRequestException(`Invalid OTP. Attempts left: ${3 - newAttempts}`);
        }

        const user = await this.authModel.findById(record.userId);
        if (!user) throw new NotFoundException('User not found');

        if (!user.mpin) {
            throw new BadRequestException('No MPIN found for this user. Please set an MPIN first');
        }

        const isSamePassword = await bcrypt.compare(newMpin, user.mpin);
        if (isSamePassword) {
            throw new BadRequestException('New MPIN cannot be the same as the old MPIN');
        }

        const hashed = await bcrypt.hash(newMpin, 10);
        user.password = hashed;
        await user.save();

        await this.redisService.del(`forgetMpin:${email}`);

        return { message: 'Password reset successfully' };
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
        const user = await this.authModel.findOne({ email, isVerified: true });
        if (!user) throw new BadRequestException('Invalid email');

        const otp = generateOtp();
        await this.redisService.set(`forget:${email}`, { otp, userId: user._id }, 300);

        await sendEmail({
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`,
        });
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

    async sendVerificationOtp(email: string) {
        const user = await this.authModel.findOne({ email });
        if (!user) throw new NotFoundException('User not found');

        if (user.isVerified) {
            throw new BadRequestException('Email is already verified');
        }
        await this.redisService.rateLimit(`verify_otp_limit:${email}`, 3, 900,
            new BadRequestException('Too many OTP requests. Please try again after 15 minutes.')
        );

        const otp = generateOtp();

        await this.redisService.set(`verify_email_otp:${email}`, { otp, attempts: 0 }, 300);

        await sendEmail({
            to: email,
            subject: 'Your Email Verification OTP',
            text: `Your OTP for email verification is: ${otp}. It will expire in 5 minutes.`,
        });

        return { message: 'OTP sent to your email' };
    }

    async verifyEmailOtp(email: string, otp: string) {
        const record = await this.redisService.get<{ otp: string; attempts: number }>(`verify_email_otp:${email}`);
        if (!record) {
            throw new BadRequestException('OTP expired or invalid');
        }

        if (record.otp !== otp) {
            const attempts = record.attempts + 1;

            if (attempts >= 3) {
                await this.redisService.del(`verify_email_otp:${email}`);
                throw new BadRequestException('Too many invalid attempts. OTP expired.');
            }

            await this.redisService.set(`verify_email_otp:${email}`, { ...record, attempts }, 300);
            throw new BadRequestException(`Invalid OTP. Attempts left: ${3 - attempts}`);
        }

        const user = await this.authModel.findOne({ email });
        if (!user) throw new NotFoundException('User not found');

        user.isVerified = true;
        await user.save();

        await this.redisService.del(`verify_email_otp:${email}`);

        return { message: 'Email verified successfully' };
    }


    async logout(userId: string, accessToken: string) {
        await this.redisService.del(`refresh_token:${userId}`);
        return { message: 'Logged out successfully' };
    }
}