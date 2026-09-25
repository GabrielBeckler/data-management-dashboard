import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppPersistenceService } from './persistence/whatsapp-persistence.service';
import { WhatsAppDelayService } from './delay.service';
import { WhatsAppClient } from './whatsapp.client';
import { SendMessageDto } from './dto/send-message.dto';
import { WhatsAppStatus } from './whatsapp.types';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly whatsappClient: WhatsAppClient,
    private readonly persistence: WhatsAppPersistenceService,
    private readonly delay: WhatsAppDelayService,
  ) {}

  async connect(): Promise<WhatsAppStatus> {
    await this.whatsappClient.connect();
    return this.getStatus();
  }

  async disconnect(): Promise<WhatsAppStatus> {
    await this.whatsappClient.disconnect();
    return this.getStatus();
  }

  getStatus(): WhatsAppStatus {
    return this.whatsappClient.getStatus();
  }

  async sendMessage(
    payload: SendMessageDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.delay.wait();
    const delivered = await this.whatsappClient.sendMessage(
      payload.phone,
      payload.message,
    );
    if (!delivered) {
      return {
        success: false,
        message:
          'WhatsApp is not connected or the contact could not be resolved.',
      };
    }

    try {
      await this.persistence.saveMessage(
        payload.phone,
        payload.message,
        'saida',
      );
    } catch {
      this.logger.error('WhatsApp message sent but could not be stored');
      return {
        success: true,
        message: 'Message sent, but conversation history could not be stored.',
      };
    }
    this.logger.log('WhatsApp message sent');
    return { success: true, message: 'Message sent successfully.' };
  }
}
