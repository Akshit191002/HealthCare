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
