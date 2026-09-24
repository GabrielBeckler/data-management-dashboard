import { Injectable, Logger } from '@nestjs/common';
import { Client, LocalAuth, Message, MessageMedia } from 'whatsapp-web.js';
import { WhatsAppStatus } from './whatsapp.types';

export interface WhatsAppClientConfig {
  sessionName?: string;
  headless?: boolean;
}

@Injectable()
export class WhatsAppClient {
  private readonly logger = new Logger(WhatsAppClient.name);
  private client: Client | null = null;
  private status: WhatsAppStatus = {
    connected: false,
    ready: false,
    status: 'disconnected',
  };

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const sessionName = process.env.WHATSAPP_SESSION_NAME ?? 'otica';
    const headless = process.env.WHATSAPP_HEADLESS !== 'false';

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: `.wwebjs_auth/${sessionName}`,
      }),
      puppeteer: {
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
      webVersionCache: {
        type: 'none',
      },
    });

    this.client.on('qr', (qr) => {
      this.status = {
        connected: false,
        ready: false,
        status: 'qr_available',
        qrCode: qr,
      };
      this.logger.warn(`WhatsApp QR code generated for session: ${sessionName}`);
    });

    this.client.on('authenticated', () => {
      this.status = {
        connected: true,
        ready: false,
        status: 'authenticated',
      };
      this.logger.log('WhatsApp authenticated');
    });

    this.client.on('ready', () => {
      this.status = {
        connected: true,
        ready: true,
        status: 'ready',
      };
      this.logger.log('WhatsApp ready');
    });

    this.client.on('auth_failure', () => {
      this.status = {
        connected: false,
        ready: false,
        status: 'auth_failed',
      };
      this.logger.error('WhatsApp authentication failed');
    });

    this.client.on('disconnected', () => {
      this.status = {
        connected: false,
        ready: false,
        status: 'disconnected',
      };
      this.logger.warn('WhatsApp disconnected');
    });
  }

  async connect(): Promise<void> {
    if (!this.client) {
        this.initialize();
    }

    this.status = {
        connected: false,
        ready: false,
        status: 'connecting',
    };

    try {
        await this.client!.initialize();
    } catch (error) {
        this.status = {
        connected: false,
        ready: false,
        status: 'disconnected',
        };

        this.logger.error('Failed to initialize WhatsApp client', error);
        throw error;
    }
}

  async disconnect(): Promise<void> {
    await this.client?.destroy();
    this.status = {
      connected: false,
      ready: false,
      status: 'disconnected',
    };
  }

  getStatus(): WhatsAppStatus {
    return { ...this.status };
  }

  async sendMessage(phone: string, message: string): Promise<boolean> {
    if (!this.client || !this.status.ready || this.status.status !== 'ready') {
      return false;
    }

    const sanitizedPhone = phone.replace(/[^\d]/g, '');
    const contact = await this.client.getContactById(`${sanitizedPhone}@c.us`);

    if (!contact) {
      return false;
    }

    await this.client.sendMessage(`${contact.id._serialized}`, message);
    return true;
  }

  async sendMedia(phone: string, media: MessageMedia): Promise<boolean> {
    if (!this.client || !this.status.ready || this.status.status !== 'ready') {
      return false;
    }

    const sanitizedPhone = phone.replace(/[^\d]/g, '');
    const chatId = `${sanitizedPhone}@c.us`;
    await this.client.sendMessage(chatId, media);
    return true;
  }

  onMessage(handler: (message: Message) => Promise<void> | void): void {
    if (!this.client) {
      return;
    }

    this.client.on('message', handler);
  }
}
