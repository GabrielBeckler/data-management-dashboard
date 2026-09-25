import { Injectable } from '@nestjs/common';

@Injectable()
export class WhatsAppDelayService {
  async wait(): Promise<void> {
    const delayMs = Number(process.env.WHATSAPP_RESPONSE_DELAY_MS ?? 800);
    if (!Number.isFinite(delayMs) || delayMs <= 0) return;
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  }
}
