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
  state: ConversationStep;
  step: ConversationStep;
  data: ConversationData;
  updatedAt?: Date;
}

export type ConversationStep =
  | 'initial'
  | 'appointment_name'
  | 'appointment_date'
  | 'appointment_time'
  | 'appointment_confirmation';

export interface AppointmentSlot {
  start: string;
  end: string;
  label: string;
}

export interface ConversationData {
  name?: string;
  date?: string;
  time?: string;
  slots?: AppointmentSlot[];
  calendarEventId?: string;
}
