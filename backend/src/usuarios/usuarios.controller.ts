import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { AccountSecurityService } from '../auth/account-security.service';
import { Roles } from '../auth/roles.decorator';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly accountSecurityService: AccountSecurityService,
  ) {}

  @Roles('admin', 'administrador')
  @Get()
  async getById(@Query('id') id: string) {
    if (!id) return null;
    return this.usuariosService.findByIdOrUsername(id);
  }

  @Roles('admin', 'administrador', 'profesor')
  @Get('requests')
  async getPendingRequests() {
    return this.usuariosService.getPendingRequests();
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  async crear(@Body() body: CreateUsuarioDto) {
    return this.usuariosService.crear({
      usuario: body.usuario,
      password: body.password,
      nombre: body.nombre,
      apellidos: body.apellidos,
      email: body.email,
      telefono: body.telefono,
      rol: 'usuario',
    });
  }

  @Roles('admin', 'administrador', 'profesor')
  @Post(':id/approve')
  async approveRequest(
    @Param('id') id: string,
    @Body() body?: { rol?: string },
  ) {
    return this.usuariosService.approveRequest(id, body?.rol);
  }

  @Roles('admin', 'administrador', 'profesor')
  @Delete(':id/reject')
  async rejectRequest(@Param('id') id: string) {
    return this.usuariosService.rejectRequest(id);
  }

  @Roles('admin', 'administrador', 'profesor')
  @Post('password-change/:tokenId/apply')
  async applyPasswordChangeRequest(
    @Param('tokenId') tokenId: string,
    @Body() body: { password?: string },
  ) {
    const password = String(body?.password ?? '').trim();
    return this.usuariosService.applyPasswordChangeRequest(tokenId, password);
  }

  @Roles('admin', 'administrador', 'profesor')
  @Delete('password-change/:tokenId/reject')
  async rejectPasswordChangeRequest(@Param('tokenId') tokenId: string) {
    return this.usuariosService.rejectPasswordChangeRequest(tokenId);
  }

  @Public()
  @Get('verify')
  async verify(@Query('token') token?: string) {
    if (!token) {
      throw new NotFoundException('Falta el token de verificacion.');
    }

    return this.accountSecurityService.verifyAccount(token);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('resend-verification')
  async resendVerification(@Body() body: ResendVerificationDto) {
    return this.accountSecurityService.resendVerification(body.email);
  }
}
