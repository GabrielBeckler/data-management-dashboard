import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Message } from 'whatsapp-web.js';
import { ConversationService } from './conversation/conversation.service';
import { WhatsAppClient } from './whatsapp.client';

@Injectable()
export class WhatsAppEvents implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppEvents.name);

  constructor(
    private readonly whatsappClient: WhatsAppClient,
    private readonly conversationService: ConversationService,
  ) {}

  onModuleInit(): void {
    this.whatsappClient.onMessage(async (message: Message) => {
      if (message.from.endsWith('@g.us')) {
        this.logger.debug('Ignoring WhatsApp group message');
        return;
      }

      const normalizedPhone = this.normalizePhone(message.from);
      const body = message.body?.trim() ?? '';

      if (!normalizedPhone || !body) {
        return;
      }

      this.logger.log(`Message received from ${normalizedPhone}`);

      const response = await this.conversationService.processIncomingMessage(
        normalizedPhone,
        body,
      );

      await message.reply(response);
    });
  }

  private normalizePhone(from?: string): string | undefined {
    if (!from) {
      return undefined;
    }

    const formatted = from.replace(/@c.us$/, '').replace(/\D/g, '');
    return formatted || undefined;
  }
}
