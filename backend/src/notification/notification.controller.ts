import { Controller, Get, Patch, Param, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationService } from './notification.service';

function staffId(req: { user?: { id?: unknown; role?: string } }) {
  const u = req.user;
  if (!u?.id) return '';
  return String(u.id);
}

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async myNotifications(@Request() req: { user?: { id?: unknown; role?: string } }) {
    const role = req.user?.role;
    if (role !== 'doctor' && role !== 'nurse' && role !== 'patient') {
      throw new ForbiddenException('Non autorisé');
    }
    const id = staffId(req);
    return this.notificationService.getMergedNotifications(id, role);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('read-all')
  async markAll(@Request() req: { user?: { id?: unknown; role?: string } }) {
    const role = req.user?.role;
    if (role !== 'doctor' && role !== 'nurse' && role !== 'patient') {
      throw new ForbiddenException();
    }
    await this.notificationService.markAllRead(staffId(req), role);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  async markOne(
    @Request() req: { user?: { id?: unknown; role?: string } },
    @Param('id') id: string,
  ) {
    const role = req.user?.role;
    if (role !== 'doctor' && role !== 'nurse' && role !== 'patient') {
      throw new ForbiddenException();
    }
    if (String(id).startsWith('virt-')) {
      return { ok: true, skipped: true };
    }
    return this.notificationService.markRead(id, staffId(req), role);
  }
}
