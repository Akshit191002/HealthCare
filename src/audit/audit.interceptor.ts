import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError } from 'rxjs';
import { AuditService } from './audit.service';
import { AUDIT_ACTION_KEY } from './audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector, private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
    const action = this.reflector.get<string>(AUDIT_ACTION_KEY, context.getHandler());
    if (!action) return next.handle();

    const request = context.switchToHttp().getRequest();
    const email = request.body?.email || 'unknown';
    const userId = request.user?.userId;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap(async () => {
        await this.auditService.log({ email, action, status: 'SUCCESS', userId, ip, userAgent });
      }),
      catchError(async (err) => {
        await this.auditService.log({ email, action, status: 'FAILURE', message: err.message, userId, ip, userAgent });
        throw err;
      }),
    );
  }
}
