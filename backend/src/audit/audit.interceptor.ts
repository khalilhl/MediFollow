import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditService } from './audit.service';

type ReqUser = { id?: string; email?: string; role?: string };

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const start = Date.now();

    const url = (req.originalUrl || req.url || '').split('?')[0];
    if (this.shouldSkip(url, req.method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        void this.persist(req, res, start, undefined);
      }),
      catchError((err) => {
        void this.persist(req, res, start, err);
        return throwError(() => err);
      }),
    );
  }

  private shouldSkip(url: string, method: string): boolean {
    if (method === 'OPTIONS' || method === 'HEAD') return true;
    if (url.includes('/api/chat/media')) return true;
    if (url.includes('/api/audit')) return true;
    return false;
  }

  private async persist(req: Request, res: Response, start: number, err: unknown) {
    const status =
      err && typeof err === 'object' && 'status' in err
        ? (err as { status?: number }).status
        : err && typeof err === 'object' && 'statusCode' in err
          ? (err as { statusCode?: number }).statusCode
          : res.statusCode;
    const url = (req.originalUrl || req.url || '').split('?')[0];
    const method = req.method;
    const user = (req as Request & { user?: ReqUser }).user;

    const category = this.categoryFromPath(url);
    const suspicious = this.isSuspicious(method, url, status ?? 500);

    const action = `${method} ${url}`;

    await this.auditService.log({
      actorId: user?.id != null ? String(user.id) : undefined,
      actorEmail: user?.email,
      actorRole: user?.role,
      action,
      category,
      severity: suspicious ? 'warning' : 'info',
      suspicious,
      statusCode: status,
      method,
      path: url,
      metadata:
        err != null
          ? {
              error: String((err as Error)?.message || err),
              durationMs: Date.now() - start,
            }
          : { durationMs: Date.now() - start },
    });
  }

  private categoryFromPath(url: string): string {
    if (url.includes('/auth')) return 'auth';
    if (url.includes('/chat')) return 'communication';
    if (url.includes('/mail')) return 'mail';
    if (
      url.includes('/patients') ||
      url.includes('/doctors') ||
      url.includes('/nurses') ||
      url.includes('/health-logs') ||
      url.includes('/medications') ||
      url.includes('/lab-analysis')
    )
      return 'data';
    if (url.includes('/users') || url.includes('toggle-active')) return 'admin';
    return 'system';
  }

  private isSuspicious(method: string, url: string, status: number): boolean {
    if (status >= 400) return true;
    if (method === 'DELETE') return true;
    if (url.includes('/toggle-active')) return true;
    if (url.includes('/seed')) return true;
    return false;
  }
}
