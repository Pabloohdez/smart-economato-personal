import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LoginService } from './login.service';
import { AuthService } from '../auth/auth.service';
import { AccountSecurityService } from '../auth/account-security.service';
import { Public } from '../auth/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { Request, Response } from 'express';

@Controller('login')
export class LoginController {
  constructor(
    private readonly loginService: LoginService,
    private readonly authService: AuthService,
    private readonly accountSecurityService: AccountSecurityService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @Post()
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.loginService.login(body.username, body.password);
    const session = await this.authService.issueSessionTokens({
      id: String(user.id),
      username: String(user.username ?? user.usuario ?? ''),
      role: typeof user.role === 'string' ? user.role : typeof user.rol === 'string' ? user.rol : null,
      nombre: typeof user.nombre === 'string' ? user.nombre : null,
    });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', session.token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 8, // coherente con JWT_EXPIRES_IN por defecto (8h)
    });
    res.cookie('refreshToken', session.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30, // coherente con 30d por defecto
    });

    return {
      user,
    };
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request & { cookies?: Record<string, string | undefined> },
    @Body() body: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokenFromCookie = req.cookies?.refreshToken;
    const refreshToken = tokenFromCookie || body.refreshToken;
    if (!refreshToken) {
      return { user: null };
    }
    const payload = this.authService.verifyRefreshToken(refreshToken);
    const user = await this.loginService.findSessionUserById(payload.sub);
    const session = await this.authService.rotateRefreshToken(refreshToken, {
      id: String(user.id),
      username: String(user.username ?? user.usuario ?? ''),
      role: typeof user.role === 'string' ? user.role : typeof user.rol === 'string' ? user.rol : null,
      nombre: typeof user.nombre === 'string' ? user.nombre : null,
    });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', session.token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 8,
    });
    res.cookie('refreshToken', session.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return {
      user,
    };
  }

  @Public()
  @Post('logout')
  async logout(
    @Req() req: Request & { cookies?: Record<string, string | undefined> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await this.authService.revokeRefreshToken(refreshToken);
    }
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    return { ok: true };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.accountSecurityService.requestPasswordReset(body.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.accountSecurityService.resetPassword(body.token, body.password);
  }
}
