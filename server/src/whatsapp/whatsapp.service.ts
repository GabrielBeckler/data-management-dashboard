import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppClient } from './whatsapp.client';
import { SendMessageDto } from './dto/send-message.dto';
import { WhatsAppStatus } from './whatsapp.types';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly whatsappClient: WhatsAppClient) {}

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

  async sendMessage(payload: SendMessageDto): Promise<{ success: boolean; message: string }> {
    const delivered = await this.whatsappClient.sendMessage(payload.phone, payload.message);

    if (!delivered) {
      return {
        success: false,
        message: 'WhatsApp is not connected or the contact could not be resolved.',
      };
    }

    this.logger.log(`Message sent to ${payload.phone}`);
    return {
      success: true,
      message: 'Message sent successfully.',
    };
  }
}
