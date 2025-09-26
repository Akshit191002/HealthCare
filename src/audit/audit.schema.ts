import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditDocument = Audit & Document;

@Schema({ timestamps: true })
export class Audit {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true, enum: ['SUCCESS', 'FAILURE'] })
  status: 'SUCCESS' | 'FAILURE';

  @Prop()
  message?: string;

  @Prop()
  userId?: string;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Object })
  extra?: Record<string, any>;
}

export const AuditSchema = SchemaFactory.createForClass(Audit);
