import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CareCoordinatorFollowupService } from './care-coordinator-followup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('departments')
export class DepartmentController {
  constructor(
    private departmentService: DepartmentService,
    private careCoordinatorFollowup: CareCoordinatorFollowupService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  async summary() {
    return this.departmentService.listSummaries();
  }

  /** Noms fusionnés pour les formulaires (patient, médecin, infirmier, coordinateur). */
  @UseGuards(JwtAuthGuard)
  @Get('catalog')
  async catalog() {
    const names = await this.departmentService.listMergedDepartmentNames();
    return { names };
  }

  /** Ajout au catalogue (super administrateur uniquement). */
  @UseGuards(JwtAuthGuard)
  @Post()
  async createCatalogDepartment(
    @Req() req: { user?: { role?: string } },
    @Body() body: { name?: string },
  ) {
    if (req.user?.role !== 'superadmin') {
      throw new ForbiddenException('Seul le super administrateur peut créer un département');
    }
    return this.departmentService.createCatalogDepartment(body.name || '');
  }

  /** GET /api/departments/doctor/my-nurses */
  @UseGuards(JwtAuthGuard)
  @Get('doctor/my-nurses')
  async myNursesForDoctor(@Req() req: { user?: { id: unknown; role: string } }) {
    const user = req.user;
    if (!user || user.role !== 'doctor') {
      throw new ForbiddenException('Accès réservé aux médecins');
    }
    return this.departmentService.getNursesForDoctor(String(user.id));
  }

  /** GET /api/departments/doctor/my-doctors */
  @UseGuards(JwtAuthGuard)
  @Get('doctor/my-doctors')
  async myDoctorsForDoctor(@Req() req: { user?: { id: unknown; role: string } }) {
    const user = req.user;
    if (!user || user.role !== 'doctor') {
      throw new ForbiddenException('Accès réservé aux médecins');
    }
    return this.departmentService.getDoctorsForDoctor(String(user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  async usersByDepartment(@Query('department') department: string) {
    return this.departmentService.getUsersByDepartment(department || '');
  }

  /** Statistiques agrégées pour le tableau de bord coordinateur. */
  @UseGuards(JwtAuthGuard)
  @Get('coordinator/dashboard-stats')
  async coordinatorDashboardStats(@Req() req: { user?: { id?: unknown; role?: string; department?: string } }) {
    const user = req.user;
    if (!user || user.role !== 'carecoordinator') {
      throw new ForbiddenException('Accès réservé aux coordinateurs de soins');
    }
    return this.careCoordinatorFollowup.getDashboardStats(user as any);
  }

  /** Patients du même département + scores de suivi (7 jours). */
  @UseGuards(JwtAuthGuard)
  @Get('coordinator/my-patients')
  async coordinatorMyPatients(@Req() req: { user?: { id?: unknown; role?: string; department?: string } }) {
    const user = req.user;
    if (!user || user.role !== 'carecoordinator') {
      throw new ForbiddenException('Accès réservé aux coordinateurs de soins');
    }
    return this.careCoordinatorFollowup.listMyDepartmentPatients(user as any);
  }

  /** Historique constantes + médicaments (12 mois) pour un patient du département. */
  @UseGuards(JwtAuthGuard)
  @Get('coordinator/patient/:patientId/history')
  async coordinatorPatientHistory(
    @Req() req: { user?: { id?: unknown; role?: string; department?: string } },
    @Param('patientId') patientId: string,
  ) {
    const user = req.user;
    if (!user || user.role !== 'carecoordinator') {
      throw new ForbiddenException('Accès réservé aux coordinateurs de soins');
    }
    return this.careCoordinatorFollowup.getPatientHistory(user as any, patientId);
  }
}
