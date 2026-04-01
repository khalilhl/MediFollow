import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('departments')
export class DepartmentController {
  constructor(private departmentService: DepartmentService) {}

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  async summary() {
    return this.departmentService.listSummaries();
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  async usersByDepartment(@Query('department') department: string) {
    return this.departmentService.getUsersByDepartment(department || '');
  }
}
