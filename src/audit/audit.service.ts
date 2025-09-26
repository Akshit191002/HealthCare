import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Audit, AuditDocument } from './audit.schema';

@Injectable()
export class AuditService {
  constructor(@InjectModel(Audit.name) private auditModel: Model<AuditDocument>) {}

  async log(options: {
    email: string;
    action: string;
    status: 'SUCCESS' | 'FAILURE';
    message?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    extra?: Record<string, any>;
  }) {
    const audit = new this.auditModel(options);
    await audit.save();
  }
}
