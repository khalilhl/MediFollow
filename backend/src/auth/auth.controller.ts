import { Controller, Post, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('confirm-login')
  async confirmLogin(@Body() body: { token: string }) {
    return this.authService.confirmLogin(body.token);
  }

  @Post('doctor-login')
  async doctorLogin(@Body() body: { email: string; password: string }) {
    return this.authService.loginDoctor(body.email, body.password);
  }

  @Post('patient-login')
  async patientLogin(@Body() body: { email: string; password: string }) {
    return this.authService.loginPatient(body.email, body.password);
  }

  @Post('nurse-login')
  async nurseLogin(@Body() body: { email: string; password: string }) {
    return this.authService.loginNurse(body.email, body.password);
  }

  @Post('passkey/register/options')
  async passkeyRegisterOptions(@Body() body: { email: string; password: string }) {
    return this.authService.getPasskeyRegistrationOptions(body.email, body.password);
  }

  @Post('passkey/register/verify')
  async passkeyRegisterVerify(
    @Body()
    body: {
      email: string;
      response: any;
      deviceLabel?: string;
    },
  ) {
    return this.authService.verifyPasskeyRegistration(body.email, body.response, body.deviceLabel);
  }

  @Post('passkey/auth/options')
  async passkeyAuthOptions(@Body() body: { email: string }) {
    return this.authService.getPasskeyAuthenticationOptions(body.email);
  }

  @Post('passkey/auth/verify')
  async passkeyAuthVerify(@Body() body: { email: string; response: any }) {
    return this.authService.verifyPasskeyAuthentication(body.email, body.response);
  }

  @UseGuards(JwtAuthGuard)
  @Get('face/status')
  async faceStatus(@Request() req: any) {
    return this.authService.getFaceEnrollmentStatus(req.user.id, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post('face/enroll')
  async faceEnroll(@Request() req: any, @Body() body: { descriptor: number[] }) {
    return this.authService.enrollFaceForCurrentUser(req.user.id, req.user.role, body.descriptor);
  }

  @UseGuards(JwtAuthGuard)
  @Post('face/disable')
  async faceDisable(@Request() req: any) {
    return this.authService.disableFaceForCurrentUser(req.user.id, req.user.role);
  }

  @Post('face/login')
  async faceLogin(@Body() body: { email?: string; descriptor: number[] }) {
    return this.authService.loginWithFace(body.email, body.descriptor);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req: any) {
    return { user: req.user };
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(
    @Request() req: any,
    @Body()
    body: {
      name?: string;
      email?: string;
      password?: string;
      profileImage?: string;
      alternateEmail?: string;
      languages?: string[];
      socialMedia?: { facebook?: string; twitter?: string; google?: string; instagram?: string; youtube?: string };
    },
  ) {
    return this.authService.updateProfile(req.user.id, body);
  }

  @Post('seed-admin')
  async seedAdmin(@Body() body: { email?: string; password?: string }) {
    const email = body.email || 'admin@medifollow.com';
    const password = body.password || 'Admin123!';
    return this.authService.createAdmin(email, password);
  }
}
