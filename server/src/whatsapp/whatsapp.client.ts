import { Injectable, Logger } from '@nestjs/common';
import { Client, LocalAuth, Message, MessageMedia } from 'whatsapp-web.js';
const qrcodeTerminal = require('qrcode-terminal') as {
  generate: (
    value: string,
    options: { small: boolean },
    callback: (code: string) => void,
  ) => void;
};
import { WhatsAppStatus } from './whatsapp.types';

export interface WhatsAppClientConfig {
  sessionName?: string;
  headless?: boolean;
}

@Injectable()
export class WhatsAppClient {
  private readonly logger = new Logger(WhatsAppClient.name);
  private client: Client | null = null;
  private pendingConnectHandler: ((status: WhatsAppStatus) => void) | null = null;
  private connectionPromise: Promise<WhatsAppStatus> | null = null;
  private clientInitialized = false;
  private status: WhatsAppStatus = {
    connected: false,
    ready: false,
    status: 'disconnected',
  };

  constructor() {
    this.initialize();
  }

  private resolvePendingConnect(status: WhatsAppStatus): void {
    if (this.pendingConnectHandler) {
      this.pendingConnectHandler({ ...status });
      this.pendingConnectHandler = null;
    }
  }

  private initialize(): void {
    const sessionName = process.env.WHATSAPP_SESSION_NAME ?? 'otica';
    const headless = process.env.WHATSAPP_HEADLESS !== 'false';

    const client = new Client({
      authStrategy: new LocalAuth({
        dataPath: `.wwebjs_auth/${sessionName}`,
      }),
      puppeteer: {
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });
    this.client = client;

    client.on('qr', (qr) => {
      if (this.client !== client) return;
      this.status = {
        connected: false,
        ready: false,
        status: 'qr_available',
        qrCode: qr,
      };
      this.resolvePendingConnect(this.status);
      qrcodeTerminal.generate(qr, { small: true }, (code) => {
        this.logger.warn(
          `WhatsApp QR code generated for session: ${sessionName}\n${code}`,
        );
      });
    });

    client.on('authenticated', () => {
      if (this.client !== client) return;
      this.status = {
        connected: true,
        ready: false,
        status: 'authenticated',
      };
      this.resolvePendingConnect(this.status);
      this.logger.log('WhatsApp authenticated');
    });

    client.on('ready', () => {
      if (this.client !== client) return;
      this.status = {
        connected: true,
        ready: true,
        status: 'ready',
      };
      this.resolvePendingConnect(this.status);
      this.logger.log('WhatsApp ready');
    });

    client.on('auth_failure', () => {
      if (this.client !== client) return;
      this.status = {
        connected: false,
        ready: false,
        status: 'auth_failed',
      };
      this.client = null;
      this.clientInitialized = false;
      this.resolvePendingConnect(this.status);
      this.logger.error('WhatsApp authentication failed');
    });

    client.on('disconnected', () => {
      if (this.client !== client) return;
      this.status = {
        connected: false,
        ready: false,
        status: 'disconnected',
      };
      this.client = null;
      this.clientInitialized = false;
      this.resolvePendingConnect(this.status);
      this.logger.warn('WhatsApp disconnected');
    });
  }

  async connect(): Promise<WhatsAppStatus> {
    const currentStatus = this.getStatus();
    if (
      currentStatus.status === 'qr_available' ||
      currentStatus.status === 'authenticated' ||
      currentStatus.status === 'ready'
    ) {
      return currentStatus;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.status = {
      connected: false,
      ready: false,
      status: 'connecting',
    };

    let attempt: Promise<WhatsAppStatus>;
    attempt = new Promise<WhatsAppStatus>((resolve, reject) => {
      this.pendingConnectHandler = (status) => {
        if (this.connectionPromise !== attempt) return;
        this.pendingConnectHandler = null;
        this.connectionPromise = null;
        resolve({ ...status });
      };

      const start = async () => {
        let initializingClient: Client | null = null;
        try {
          if (!this.client) {
            this.initialize();
          }
          initializingClient = this.client;

          if (!this.clientInitialized) {
            await initializingClient!.initialize();
            if (this.client === initializingClient) {
              this.clientInitialized = true;
            }
          }
        } catch (error) {
          const failedClient = initializingClient;
          if (
            (failedClient && this.client === failedClient) ||
            (!failedClient && this.connectionPromise === attempt)
          ) {
            this.client = null;
            this.clientInitialized = false;
            this.pendingConnectHandler = null;
            this.connectionPromise = null;
            this.status = {
              connected: false,
              ready: false,
              status: 'disconnected',
            };
          }
          this.logger.error('Failed to initialize WhatsApp client', error);
          await failedClient?.destroy().catch(() => undefined);
          reject(error);
        }
      };

      void start();
    });

    this.connectionPromise = attempt;
    return attempt;
  }

  async disconnect(): Promise<void> {
    const client = this.client;
    this.client = null;
    this.clientInitialized = false;
    this.status = {
      connected: false,
      ready: false,
      status: 'disconnected',
    };
    this.resolvePendingConnect(this.status);
    await client?.destroy();
  }

  getStatus(): WhatsAppStatus {
    return { ...this.status };
  }

  async sendMessage(phone: string, message: string): Promise<boolean> {
    const client = this.client;
    if (!client || !this.status.ready || this.status.status !== 'ready') {
      return false;
    }

    let sanitizedPhone = phone.replace(/\D/g, '');
    // Remove Brazil's domestic trunk prefix before checking the country code.
    if (sanitizedPhone.startsWith('0')) {
      sanitizedPhone = sanitizedPhone.replace(/^0+/, '');
    }
    if (!sanitizedPhone.startsWith('55')) {
      sanitizedPhone = `55${sanitizedPhone}`;
    }

    try {
      const numberId = await client.getNumberId(sanitizedPhone);
      if (!numberId) return false;

      await client.sendMessage(numberId._serialized, message);
      return true;
    } catch (error) {
      this.logger.warn(
        `Could not send WhatsApp message to ${sanitizedPhone}`,
        error,
      );
      return false;
    }
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
