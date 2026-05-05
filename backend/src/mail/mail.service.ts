import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type MailDeliveryMode = 'smtp' | 'log';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  async sendMail(payload: MailPayload): Promise<MailDeliveryMode> {
    const mode = this.getMailMode();

    if (mode === 'log') {
      this.logger.warn(
        [
          'MAIL_MODE=log activo. Correo no enviado por SMTP.',
          `To: ${payload.to}`,
          `Subject: ${payload.subject}`,
          payload.text,
        ].join('\n'),
      );
      return mode;
    }

    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: this.getFromAddress(),
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    return mode;
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.requiredEnv('SMTP_HOST');
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = (process.env.SMTP_USER || '').trim();
    const pass = (process.env.SMTP_PASS || '').trim();
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    return this.transporter;
  }

  private getMailMode() {
    const mode = String(process.env.MAIL_MODE || '').trim().toLowerCase();
    if (mode === 'smtp') {
      return 'smtp';
    }

    if (mode === 'log') {
      return 'log';
    }

    return this.hasEnv('SMTP_HOST') ? 'smtp' : 'log';
  }

  private getFromAddress() {
    return process.env.SMTP_FROM || process.env.SMTP_USER || 'Smart Economato <no-reply@smart-economato.local>';
  }

  private hasEnv(name: string) {
    const value = process.env[name];
    return Boolean(value && value.trim().length > 0);
  }

  private requiredEnv(name: string) {
    const value = process.env[name];
    if (!value || value.trim().length === 0) {
      throw new InternalServerErrorException(`Falta configurar ${name} para el envio real de correos.`);
    }
    return value;
  }
}