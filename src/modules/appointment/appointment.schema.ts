// // import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// // import { Document, Types } from 'mongoose';

// // export type AppointmentDocument = Appointment & Document;

// // @Schema({ timestamps: true })
// // export class Appointment {
// //   @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
// //   patient: Types.ObjectId;

// //   @Prop({ type: String, required: true })
// //   patientFhirId: string;

// //   @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true })
// //   doctor: Types.ObjectId;

// //   @Prop({ type: String, required: true })
// //   doctorFhirId: string;

// //   @Prop({ required: true })
// //   date: Date;

// //   @Prop({ required: true })
// //   fhirId: string

// //   @Prop({ default: 'scheduled', enum: ['scheduled', 'completed', 'cancelled'] })
// //   status: string;

// //   @Prop()
// //   notes?: string;
// // }

// // export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document, Types } from 'mongoose';

// export type AppointmentDocument = Appointment & Document;

// @Schema({ timestamps: true })
// export class Appointment {
//   @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
//   patient: Types.ObjectId;

//   @Prop({ type: String, required: true })
//   patientFhirId: string;

//   @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true })
//   doctor: Types.ObjectId;

//   @Prop({ type: String, required: true })
//   doctorFhirId: string;

//   // Make date optional at schema level
//   @Prop({ required: false })
//   date?: Date;

//   @Prop({ required: true })
//   fhirId: string;

//   @Prop({ default: 'scheduled', enum: ['scheduled', 'completed', 'cancelled'] })
//   status: string;

//   @Prop()
//   notes?: string;
// }

// export const AppointmentSchema = SchemaFactory.createForClass(Appointment);


import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AppointmentDocument = Appointment & Document;

export enum AppointmentStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  RESCHEDULED = 'RESCHEDULED',
}

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patient: Types.ObjectId; // patient document

  @Prop({ type: Types.ObjectId, required: true })
  patientEntryId: Types.ObjectId; // selected member

  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true })
  doctor: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ required: true })
  startTime: string; // "HH:MM"

  @Prop({ required: true })
  endTime: string; // "HH:MM"

  @Prop({ enum: AppointmentStatus, default: AppointmentStatus.PENDING })
  status: AppointmentStatus;

  @Prop({ required: true })
  fee: number; // doctor fee

  @Prop({ required: false })
  reason: string; // optional reason for appointment

  @Prop({ required: false })
  doctorLocation: string; // city
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
