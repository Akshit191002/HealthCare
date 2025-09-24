import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Auth } from 'src/auth/auth.schema';

@Schema()
export class Patient {
  @Prop({ required: true })
  encryptedData: string;

  @Prop({ required: true })
  iv: string;

  @Prop({ required: true })
  tag: string;

  @Prop({ required: true })
  fhirId: string;

  @Prop({ type: Types.ObjectId, ref: Auth.name, required: true })
  user: Types.ObjectId;
}

export type PatientDocument = Patient & Document;
export const PatientSchema = SchemaFactory.createForClass(Patient);
