import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { MoodComplianceService } from './services/mood-compliance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('patients')
export class PatientController {
  constructor(
    private patientService: PatientService,
    private moodComplianceService: MoodComplianceService,
  ) {}

  @Post('register')
  async registerPublic(@Body() body: any) {
    // Basic mapping from fullName to firstName/lastName for the public registration form
    const splitName = (body.fullName || '').trim().split(' ');
    const firstName = splitName[0] || 'Unknown';
    const lastName = splitName.slice(1).join(' ') || 'User';

    return this.patientService.create({
      firstName,
      lastName,
      email: body.email,
      password: body.password,
      role: 'patient',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: any) {
    return this.patientService.create(body);
  }

  @Get()
  async findAll() {
    return this.patientService.findAll();
  }

  /** Avant :id — GET /api/patients/doctor/my-patients */
  @UseGuards(JwtAuthGuard)
  @Get('doctor/my-patients')
  async myPatientsForDoctor(@Req() req: { user?: { id: unknown; role: string } }) {
    const user = req.user;
    if (!user || user.role !== 'doctor') {
      throw new ForbiddenException('Accès réservé aux médecins');
    }
    return this.patientService.findByAssignedDoctorId(String(user.id));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.patientService.findById(id);
  }

  // ─── Multimodal Mood & Compliance Insights ───────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get(':id/mood-insights')
  async getMoodInsights(@Param('id') id: string, @Req() req: any) {
    const userRole = req.user?.role;
    if (!['doctor', 'nurse', 'carecoordinator', 'superadmin', 'admin'].includes(userRole)) {
      throw new ForbiddenException('Accès non autorisé aux insights');
    }
    const patient = await this.patientService.findById(id);
    return (patient as any).dailyInsights || [];
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/generate-insight')
  async generateInsight(@Param('id') id: string) {
    return this.moodComplianceService.generateDailyInsight(id);
  }
  // ─────────────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.patientService.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.patientService.delete(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    return this.patientService.toggleActive(id);
  }

  @Get(':id/care-team')
  async getCareTeam(@Param('id') id: string) {
    return this.patientService.getCareTeam(id);
  }
}
