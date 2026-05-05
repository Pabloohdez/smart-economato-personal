import { Controller, MessageEvent, Query, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Public } from '../auth/public.decorator';
import { RealtimeService } from './realtime.service';

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Public()
  @Sse('stream')
  stream(@Query('token') token?: string): Observable<MessageEvent> {
    const normalizedToken = token?.startsWith('Bearer ') ? token.slice(7) : token;
    return this.realtimeService.connect(normalizedToken);
  }
}