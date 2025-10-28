import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PatientRole {
  SELF = 'self',
  FAMILY = 'family',
}

export enum Status {
  ACCEPT = 'accept',
  PENDING = 'pending',
  REJECT = 'reject'
}

@Schema()
export class Patient {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: false })
  parentId?: Types.ObjectId;

  @Prop({ required: true })
  encryptedData: string;

  @Prop({ required: true })
  iv: string;

  @Prop({ required: true })
  tag: string;

  @Prop({ required: true })
  fhirId: string;

  @Prop({ type: String })
  squareCustomerId?: string;

  @Prop({ type: String })
  cardId?: string;

  @Prop({ type: String, enum: PatientRole, required: true })
  role: PatientRole;

  @Prop({ type: String, enum: Status, default: Status.PENDING, required: true })
  status: Status;
}

export type PatientDocument = Patient & Document;
export const PatientSchema = SchemaFactory.createForClass(Patient);
