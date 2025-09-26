import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment, AppointmentDocument } from './appointment.schema';
import { FhirService } from '../fhir/fhir.service';
import { CreateAppointmentDto } from './dto/createAppointment.dto';
import { Patient, PatientDocument } from 'src/patient/patient.schema';
import { Doctor, DoctorDocument } from 'src/doctor/doctor.schema';
import { decryptPHI } from 'src/utils/encryption.util';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    @InjectModel(Doctor.name) private doctorModel: Model<DoctorDocument>,
    private readonly fhirService: FhirService,
  ) { }

  async getMyPatient(userId: string) {
    const patient = await this.patientModel.findOne({ user: userId });
    if (!patient) throw new NotFoundException('Patient not found for this user');
    const decryptedData = JSON.parse(decryptPHI(patient.encryptedData, patient.iv, patient.tag));
    return {
      id: patient._id,
      fhirId: patient.fhirId,
      data: decryptedData,
    };
  }

  async getDoctorByUserId(userId: string) {
    const doctor = await this.doctorModel.findOne({ user: userId });
    if (!doctor) throw new NotFoundException('Doctor not found');
    const decryptedData = JSON.parse(decryptPHI(doctor.encryptedData, doctor.iv, doctor.tag));
    return {
      id: doctor._id,
      fhirId: doctor.fhirId,
      data: decryptedData
    };
  }

  private async findNextAvailableSlot(doctorId: string): Promise<Date> {
    let currentDate = new Date();
    currentDate.setHours(9, 0, 0, 0);

    while (true) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dailyAppointments = await this.appointmentModel.find({
        doctor: doctorId,
        date: { $gte: dayStart, $lte: dayEnd },
        status: 'scheduled',
      }).sort({ date: 1 });

      if (dailyAppointments.length < 10) {
        for (let hour = 9; hour <= 18; hour++) {
          const slot = new Date(dayStart);
          slot.setHours(hour, 0, 0, 0);
          if (!dailyAppointments.some(a => a.date && a.date.getTime() === slot.getTime())) {
            return slot;
          }
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // async createAppointment(dto: CreateAppointmentDto, patientUserId: string) {
  //   const patient = await this.getMyPatient(patientUserId);
  //   if (!patient) throw new NotFoundException('Patient not found for this user');
  //   const patientfhirId = patient.fhirId

  //   const doctor = await this.getDoctorByUserId(dto.doctorId);
  //   if (!doctor) throw new NotFoundException('Doctor not found');
  //   const doctorfhirId = doctor.fhirId

  //   const fhirAppointmentId = await this.fhirService.createAppointment({
  //     patientFhirId: patientfhirId,
  //     doctorFhirId: doctorfhirId,
  //     date: dto.date,
  //     notes: dto.notes,
  //   });

  //   const appointment = new this.appointmentModel({
  //     patient: new Types.ObjectId(patient.id),
  //     doctor: new Types.ObjectId(dto.doctorId),
  //     date: dto.date,
  //     status: 'scheduled',
  //     notes: dto.notes,
  //     fhirId: fhirAppointmentId,
  //     patientFhirId: patientfhirId,
  //     doctorFhirId: doctorfhirId,
  //   });

  //   await appointment.save();

  //   return {
  //     id: appointment._id,
  //     fhirId: fhirAppointmentId,
  //     status: appointment.status,
  //     date: appointment.date,
  //     notes: appointment.notes,
  //     doctorId: dto.doctorId,
  //   };
  // }

  async createAppointment(dto: CreateAppointmentDto, patientUserId: string) {
    const patient = await this.getMyPatient(patientUserId);

    const existingAppointment = await this.appointmentModel.findOne({
      patient: patient.id,
      status: 'scheduled',
    });

    if (existingAppointment) {
      throw new BadRequestException(
        'You already have an active appointment. Please complete or cancel it before booking a new one.'
      );
    }

    const doctor = await this.getDoctorByUserId(dto.doctorId);

    let appointmentDate: Date;

    if (dto.date) {
      appointmentDate = new Date(dto.date);

      const doctorAppointmentsCount = await this.appointmentModel.countDocuments({
        doctor: doctor.id,
        date: {
          $gte: new Date(appointmentDate.setHours(0, 0, 0, 0)),
          $lte: new Date(appointmentDate.setHours(23, 59, 59, 999)),
        },
      });

      if (doctorAppointmentsCount >= 10) {
        throw new BadRequestException(
          'Doctor is fully booked on this date. Please choose another date.'
        );
      }
    } else {
      appointmentDate = await this.findNextAvailableSlot(doctor.id);
    }

    const fhirAppointmentId = await this.fhirService.createAppointment({
      patientFhirId: patient.fhirId,
      doctorFhirId: doctor.fhirId,
      date: appointmentDate.toISOString(),
      notes: dto.notes,
    });

    const appointment = new this.appointmentModel({
      patient: patient.id,
      doctor: doctor.id,
      date: appointmentDate,
      status: 'scheduled',
      notes: dto.notes,
      fhirId: fhirAppointmentId,
      patientFhirId: patient.fhirId,
      doctorFhirId: doctor.fhirId,
    });

    await appointment.save();

    return {
      id: appointment._id,
      fhirId: fhirAppointmentId,
      status: appointment.status,
      date: appointment.date,
      notes: appointment.notes,
      doctorId: dto.doctorId,
    };
  }

  async getAppointmentsForDoctor(doctorUserId: string) {
    const doctor = await this.getDoctorByUserId(doctorUserId);

    const appointments = await this.appointmentModel
      .find({ doctor: doctor.id })
      .populate<{ patient: PatientDocument }>('patient')
      .exec();

    if (appointments.length === 0) {
      throw new NotFoundException('No Available Appointment');
    }
    return appointments.map(app => {
      const decryptedPatient = JSON.parse(
        decryptPHI(app.patient.encryptedData, app.patient.iv, app.patient.tag)
      );

      return {
        id: app._id,
        date: app.date,
        status: app.status,
        notes: app.notes,
        fhirId: app.fhirId,
        patientFhirId: app.patientFhirId,
        doctorFhirId: app.doctorFhirId,
        patient: {
          id: app.patient._id,
          ...decryptedPatient,
        },
      };
    });
  }

  async getAppointmentsForPatient(patientUserId: string) {
    const patient = await this.getMyPatient(patientUserId);

    const appointments = await this.appointmentModel
      .find({ patient: patient.id })
      .populate<{ doctor: DoctorDocument }>('doctor')
      .exec();

    if (appointments.length === 0) {
      throw new NotFoundException('No Available Appointment');
    }

    return appointments.map(app => {
      const decryptedDoctor = JSON.parse(
        decryptPHI(app.doctor.encryptedData, app.doctor.iv, app.doctor.tag)
      );

      return {
        id: app._id,
        date: app.date,
        status: app.status,
        notes: app.notes,
        fhirId: app.fhirId,
        doctorFhirId: app.doctorFhirId,
        patientFhirId: app.patientFhirId,
        doctor: {
          id: app.doctor._id,
          ...decryptedDoctor,
        },
      };
    });
  }

}