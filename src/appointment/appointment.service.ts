import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment, AppointmentDocument } from './appointment.schema';
import { PatientsService } from '../patient/patients.service';
import { DoctorsService } from '../doctor/doctor.service';
import { FhirService } from '../fhir/fhir.service';
import { CreateAppointmentDto } from './dto/createAppointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
    private readonly patientsService: PatientsService,
    private readonly doctorsService: DoctorsService,
    private readonly fhirService: FhirService,
  ) {}

  async createAppointment(dto: CreateAppointmentDto, patientUserId: string) {
    const patient = await this.patientsService.getMyPatient(patientUserId);
    if (!patient) throw new NotFoundException('Patient record not found');

    const doctor = await this.doctorsService.getDoctorById(dto.doctorId); 
    if (!doctor) throw new NotFoundException('Doctor not found');

    const fhirAppointmentId = await this.fhirService.createAppointment({
      patientFhirId: patient.fhirId,
      doctorFhirId: doctor.fhirId,
      date: dto.date,
      notes: dto.notes,
    });

    const appointment = new this.appointmentModel({
      patient: new Types.ObjectId(patient.id),
      doctor: new Types.ObjectId(dto.doctorId),
      date: dto.date,
      status: 'scheduled',
      notes: dto.notes,
      fhirId: fhirAppointmentId,
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

  async getAppointmentsForPatient(patientUserId: string) {
    const patient = await this.patientsService.getMyPatient(patientUserId);
    return this.appointmentModel.find({ patient: patient.id }).populate('doctor');
  }

  async getAppointmentsForDoctor(doctorUserId: string) {
    const doctor = await this.doctorsService.getDoctorByUserId(doctorUserId);
    return this.appointmentModel.find({ doctor: doctor.id }).populate('patient');
  }
}
