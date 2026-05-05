import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MailModule } from '../mail/mail.module';
import { AccountSecurityService } from './account-security.service';
import { AuthSchemaService } from './auth-schema.service';

@Global()
@Module({
  imports: [MailModule],
  providers: [AuthService, AccountSecurityService, AuthSchemaService],
  exports: [AuthService, AccountSecurityService],
})
export class AuthModule {}
