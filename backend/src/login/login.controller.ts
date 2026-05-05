import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LoginService } from './login.service';
import { AuthService } from '../auth/auth.service';
import { AccountSecurityService } from '../auth/account-security.service';
import { Public } from '../auth/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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
  async login(@Body() body: LoginDto) {
    const user = await this.loginService.login(body.username, body.password);
    const session = await this.authService.issueSessionTokens({
      id: String(user.id),
      username: String(user.username ?? user.usuario ?? ''),
      role: typeof user.role === 'string' ? user.role : typeof user.rol === 'string' ? user.rol : null,
      nombre: typeof user.nombre === 'string' ? user.nombre : null,
    });

    return {
      token: session.token,
      refreshToken: session.refreshToken,
      user,
    };
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto) {
    const payload = this.authService.verifyRefreshToken(body.refreshToken);
    const user = await this.loginService.findSessionUserById(payload.sub);
    const session = await this.authService.rotateRefreshToken(body.refreshToken, {
      id: String(user.id),
      username: String(user.username ?? user.usuario ?? ''),
      role: typeof user.role === 'string' ? user.role : typeof user.rol === 'string' ? user.rol : null,
      nombre: typeof user.nombre === 'string' ? user.nombre : null,
    });

    return {
      token: session.token,
      refreshToken: session.refreshToken,
      user,
    };
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
