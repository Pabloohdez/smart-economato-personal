import { Injectable, MessageEvent, UnauthorizedException } from '@nestjs/common';
import { interval, merge, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

type RealtimePayload = {
  keys: string[];
  at: string;
  source: string;
};

const HEARTBEAT_MS = 25_000;

@Injectable()
export class RealtimeService {
  private readonly events$ = new Subject<RealtimePayload>();

  constructor(private readonly authService: AuthService) {}

  connect(token?: string): Observable<MessageEvent> {
    const normalizedToken = token?.trim();
    if (!normalizedToken) {
      throw new UnauthorizedException('Token requerido para tiempo real');
    }

    this.authService.verifyToken(normalizedToken);

    return merge(
      this.events$.pipe(
        map((payload) => ({
          type: 'invalidate',
          data: payload,
        }) satisfies MessageEvent),
      ),
      interval(HEARTBEAT_MS).pipe(
        map(() => ({
          type: 'heartbeat',
          data: {
            at: new Date().toISOString(),
          },
        }) satisfies MessageEvent),
      ),
    );
  }

  publish(keys: string[], source = 'api') {
    const uniqueKeys = [...new Set(keys.map((key) => String(key).trim()).filter(Boolean))];
    if (uniqueKeys.length === 0) {
      return;
    }

    this.events$.next({
      keys: uniqueKeys,
      at: new Date().toISOString(),
      source,
    });
  }
}