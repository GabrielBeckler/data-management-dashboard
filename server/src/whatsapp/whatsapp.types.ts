export type WhatsAppConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'authenticated'
  | 'ready'
  | 'qr_available'
  | 'auth_failed';

export interface WhatsAppStatus {
  connected: boolean;
  ready: boolean;
  status: WhatsAppConnectionStatus;
  qrCode?: string;
}

export interface SendMessagePayload {
  phone: string;
  message: string;
}

export interface IncomingWhatsAppMessage {
  phone: string;
  body: string;
  from?: string;
  author?: string;
}

export interface ConversationState {
  phone: string;
  state: string;
  step?: string;
  data?: Record<string, unknown>;
  updatedAt?: Date;
}
