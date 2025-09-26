import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum Role {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin'
}

@Schema()
export class Auth {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: String, enum: Role, default: Role.PATIENT })
  role: Role;
}

export type AuthDocument = Auth & Document;
export const AuthSchema = SchemaFactory.createForClass(Auth);
