import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Doctor {
  @Prop({ required: true })
  encryptedData: string;

  @Prop({ required: true })
  iv: string;

  @Prop({ required: true })
  tag: string;

  @Prop()
  fhirId: string;

  @Prop({ type: Types.ObjectId, ref: 'Auth', required: true })
  user: Types.ObjectId;
}

export type DoctorDocument = Doctor & Document;
export const DoctorSchema = SchemaFactory.createForClass(Doctor);
