import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class SmartThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip =
      req.ip
      || req.headers?.['x-forwarded-for']?.split(',')?.[0]?.trim()
      || req.connection?.remoteAddress
      || 'unknown';

    const path = String(req.originalUrl || req.url || '');
    // Para endpoints de login, mezclamos IP + username para frenar brute force distribuido.
    if (path.includes('/api/login') && req.body?.username) {
      return `${ip}:${String(req.body.username).toLowerCase()}`;
    }
    return String(ip);
  }
}

