import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { decryptPHI } from '../utils/encryption.util';
import { Appointment, AppointmentDocument, AppointmentStatus } from './appointment.schema';
import { Patient, PatientDocument } from 'src/patient/patient.schema';
import { Doctor, DoctorDocument } from 'src/doctor/doctor.schema';
import { sendEmail } from 'src/utils/email.util';
import { Auth, AuthDocument } from 'src/auth/auth.schema';

@Injectable()
export class AppointmentService {
    constructor(
        @InjectModel(Appointment.name) private readonly appointmentModel: Model<AppointmentDocument>,
        @InjectModel(Auth.name) private authModel: Model<AuthDocument>,
        @InjectModel(Patient.name) private readonly patientModel: Model<PatientDocument>,
        @InjectModel(Doctor.name) private readonly doctorModel: Model<DoctorDocument>,
    ) { }


    async bookAppointment(userId: string, patientEntryId: string, doctorId: string, date: string, startTime: string, endTime: string, reason?: string,) {
        const userObjectId = new Types.ObjectId(userId);
        const patientEntry = await this.patientModel.findOne(
            { user: userObjectId, 'patients._id': patientEntryId },
            { 'patients.$': 1 }
        );
        if (!patientEntry) throw new BadRequestException('Selected patient member not found');

        const doctor = await this.doctorModel.findById(doctorId);
        if (!doctor) throw new NotFoundException('Doctor not found');

        const doctorData = JSON.parse(decryptPHI(doctor.encryptedData, doctor.iv, doctor.tag));

        const appointmentDate = new Date(date);

        const dailyAppointments = await this.appointmentModel.find({
            doctor: doctorId,
            date: appointmentDate,
            status: { $in: [AppointmentStatus.PENDING, AppointmentStatus.ACCEPTED] },
        });

        if (dailyAppointments.length >= 10) {
            throw new BadRequestException('Doctor reached maximum appointments for this day. Please select another date.');
        }

        const timeConflict = dailyAppointments.find(a => a.startTime === startTime);
        if (timeConflict) {
            const suggestedSlot = this.suggestNextSlot(dailyAppointments, startTime);
            throw new BadRequestException(`Doctor is busy at this time. Next available slot: ${suggestedSlot}`);
        }

        const appointment = await this.appointmentModel.create({
            patient: userObjectId,
            patientEntryId: new Types.ObjectId(patientEntryId),
            doctor: new Types.ObjectId(doctorId),
            date: appointmentDate,
            startTime,
            endTime,
            status: AppointmentStatus.PENDING,
            fee: doctorData.fee || 0,
            reason,
            doctorLocation: doctorData.address?.city,
        });

        await sendEmail({
            to: doctorData.email,
            subject: 'New Appointment Request',
            text: `You have a new appointment request appointmentId is ${appointment._id}. Please accept or reject.`,
        });

        return appointment;
    }
    private suggestNextSlot(existingAppointments: AppointmentDocument[], startTime: string) {
        const [hour, minute] = startTime.split(':').map(Number);
        let requestedMinutes = hour * 60 + minute;

        const busySlots = existingAppointments.map(a => {
            const [sHour, sMin] = a.startTime.split(':').map(Number);
            const [eHour, eMin] = a.endTime.split(':').map(Number);
            return { start: sHour * 60 + sMin, end: eHour * 60 + eMin };
        }).sort((a, b) => a.start - b.start);

        while (true) {
            const conflict = busySlots.some(slot => requestedMinutes < slot.end && requestedMinutes + 30 > slot.start);
            if (!conflict) break;
            requestedMinutes += 30;
        }

        const nextHour = Math.floor(requestedMinutes / 60);
        const nextMinute = requestedMinutes % 60;

        const hh = nextHour.toString().padStart(2, '0');
        const mm = nextMinute.toString().padStart(2, '0');

        return `${hh}:${mm}`;
    }


    async respondAppointment(
        appointmentId: string,
        action: 'ACCEPT' | 'REJECT' | 'RESCHEDULE',
        newDate?: string,
        newStartTime?: string,
        newEndTime?: string,
    ) {
        const appointment = await this.appointmentModel.findById(appointmentId);
        if (!appointment) throw new NotFoundException('Appointment not found');

        if (action === 'ACCEPT') appointment.status = AppointmentStatus.ACCEPTED;
        else if (action === 'REJECT') appointment.status = AppointmentStatus.REJECTED;
        else if (action === 'RESCHEDULE') {
            if (!newDate || !newStartTime || !newEndTime)
                throw new BadRequestException('New date and time must be provided for reschedule');
            appointment.status = AppointmentStatus.RESCHEDULED;
            appointment.date = new Date(newDate);
            appointment.startTime = newStartTime;
            appointment.endTime = newEndTime;
        }

        await appointment.save();

        const patientUser = await this.authModel.findById(appointment.patient);
        if (!patientUser) throw new NotFoundException('Patient not found');

        const doctor = await this.doctorModel.findById(appointment.doctor);
        if (!doctor) throw new NotFoundException('Doctor not found');
        const doctorData = JSON.parse(decryptPHI(doctor.encryptedData, doctor.iv, doctor.tag));

        const patientEmail = patientUser.email;

        await sendEmail({
            to: patientEmail,
            subject: `Your appointment has been ${appointment.status.toLowerCase()}`,
            text: `Appointment with Dr. ${doctorData.firstName} ${doctorData.lastName} has been ${appointment.status}.
Date: ${appointment.date} 
Time: ${appointment.startTime} - ${appointment.endTime}`,
        });

        return appointment;
    }

    async getAppointments(userId: string, role: 'doctor' | 'patient') {
        if (role === 'doctor') {
            const doctor = await this.doctorModel.findOne({ user: userId });
            if (!doctor) throw new NotFoundException('Doctor not found');
            return this.appointmentModel.find({ doctor: doctor._id }).sort({ date: 1, startTime: 1 });
        } else {
            const patient = await this.patientModel.findOne({ user: userId });
            if (!patient) throw new NotFoundException('Patient not found');
            return this.appointmentModel.find({ patient: patient._id }).sort({ date: 1, startTime: 1 });
        }
    }

}
