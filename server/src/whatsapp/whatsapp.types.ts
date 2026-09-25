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
  | 'appointment_confirmation'
  | 'cancel_appointment_selection'
  | 'reschedule_appointment_selection';

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
  appointmentId?: string;
  appointmentAction?: 'cancel' | 'reschedule';
  appointments?: AppointmentConversationOption[];
  previousAppointment?: AppointmentConversationOption;
  slotEnd?: string;
}

export interface AppointmentConversationOption {
  id: string;
  name: string;
  date: string;
  start: string;
  end: string;
  googleEventId?: string;
}
