import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Message } from 'whatsapp-web.js';
import { ConversationService } from './conversation/conversation.service';
import { WhatsAppDelayService } from './delay.service';
import { WhatsAppPersistenceService } from './persistence/whatsapp-persistence.service';
import { WhatsAppClient } from './whatsapp.client';

@Injectable()
export class WhatsAppEvents implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppEvents.name);

  constructor(
    private readonly whatsappClient: WhatsAppClient,
    private readonly conversationService: ConversationService,
    private readonly persistence: WhatsAppPersistenceService,
    private readonly delay: WhatsAppDelayService,
  ) {}

  onModuleInit(): void {
    this.whatsappClient.onMessage(async (message: Message) => {
      if (message.from.endsWith('@g.us')) {
        this.logger.debug('Ignoring WhatsApp group message');
        return;
      }

      const normalizedPhone = this.normalizePhone(message.from);
      const body = message.body?.trim() ?? '';
      if (!normalizedPhone || !body) return;

      try {
        await this.persistence.saveMessage(normalizedPhone, body, 'entrada');
        const responses = await this.conversationService.processIncomingMessage(
          normalizedPhone,
          body,
        );
        for (const response of responses) {
          await this.delay.wait();
          await message.reply(response);
          try {
            await this.persistence.saveMessage(
              normalizedPhone,
              response,
              'saida',
            );
          } catch {
            this.logger.error('WhatsApp response sent but could not be stored');
          }
        }
      } catch {
        this.logger.error('Could not process incoming WhatsApp message');
        try {
          await this.delay.wait();
          await message.reply(
            'Desculpe, não consegui processar sua mensagem agora. Tente novamente em instantes.',
          );
        } catch {
          this.logger.error(
            'Could not send WhatsApp processing error response',
          );
        }
      }
    });
  }

  private normalizePhone(from?: string): string | undefined {
    if (!from) return undefined;
    const formatted = from.replace(/@c\.us$/, '').replace(/\D/g, '');
    return formatted || undefined;
  }
}
