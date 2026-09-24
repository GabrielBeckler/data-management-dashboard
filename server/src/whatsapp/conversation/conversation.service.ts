import { Injectable, Logger } from '@nestjs/common';
import { GoogleCalendarService } from '../../google-calendar/google-calendar.service';
import { ConversationState } from '../whatsapp.types';
import { ConversationStateStore } from './conversation.types';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly stateStore: ConversationStateStore,
    private readonly calendarService: GoogleCalendarService,
  ) {}

  getOrCreateState(phone: string): ConversationState {
    const existing = this.stateStore.get(phone);
    if (existing) return existing;

    const initialState: ConversationState = {
      phone,
      state: 'initial',
      step: 'initial',
      data: {},
    };
    this.stateStore.set(phone, initialState);
    return initialState;
  }

  async processIncomingMessage(phone: string, message: string): Promise<string> {
    const state = this.getOrCreateState(phone);
    const input = message.trim();
    let reply: string;

    if (input.toLowerCase() === 'menu' || input === '0') {
      state.state = 'initial';
      state.step = 'initial';
      state.data = {};
      reply = this.menu();
    } else {
      switch (state.step) {
        case 'appointment_name':
          reply = this.handleName(state, input);
          break;
        case 'appointment_date':
          reply = await this.handleDate(state, input);
          break;
        case 'appointment_time':
          reply = this.handleTime(state, input);
          break;
        case 'appointment_confirmation':
          reply = await this.handleConfirmation(state, input);
          break;
        case 'initial':
        default:
          reply = this.handleMenu(state, input);
      }
    }

    this.stateStore.set(phone, state);
    return reply;
  }

  private handleMenu(state: ConversationState, input: string): string {
    if (input === '1') {
      state.state = 'appointment_name';
      state.step = 'appointment_name';
      state.data = {};
      return 'Vamos agendar seu atendimento. Qual é o seu nome?';
    }
    if (input === '2') return 'Nosso endereço é Rua dos Bobos, nº 0.';
    return this.menu();
  }

  private handleName(state: ConversationState, name: string): string {
    if (!name) return 'Por favor, informe seu nome.';
    state.data.name = name;
    state.state = 'appointment_date';
    state.step = 'appointment_date';
    return 'Qual data você prefere? Informe no formato DD/MM ou DD/MM/AAAA.';
  }

  private async handleDate(state: ConversationState, input: string): Promise<string> {
    const date = this.calendarService.parseAppointmentDate(input);
    if (!date) {
      return 'Essa data não é válida ou está fora dos próximos 30 dias. Informe outra data no formato DD/MM ou DD/MM/AAAA.';
    }

    try {
      const slots = await this.calendarService.getAvailableSlots(date);
      if (slots.length === 0) {
        return `Não há horários disponíveis para ${this.displayDate(date)}. Informe outra data dentro dos próximos 30 dias.`;
      }
      state.data.date = date;
      state.data.slots = slots;
      state.step = 'appointment_time';
      state.state = 'appointment_time';
      return this.formatSlots(date, slots);
    } catch {
      this.logger.error('Google Calendar availability lookup failed');
      return 'Não consegui consultar a agenda agora. Tente novamente em alguns instantes.';
    }
  }

  private handleTime(state: ConversationState, input: string): string {
    const selection = Number(input);
    const selectedSlot = Number.isInteger(selection)
      ? state.data.slots?.[selection - 1]
      : undefined;
    if (!selectedSlot) {
      return 'Escolha um dos números da lista de horários disponíveis.';
    }

    state.data.time = selectedSlot.start;
    state.step = 'appointment_confirmation';
    state.state = 'appointment_confirmation';
    return [
      'Confirme seu agendamento:',
      '',
      `Nome: ${state.data.name ?? ''}`,
      `Data: ${this.displayDate(state.data.date ?? '')}`,
      `Horário: ${selectedSlot.start}`,
      '',
      '1 - Confirmar',
      '2 - Cancelar',
    ].join('\n');
  }

  private async handleConfirmation(
    state: ConversationState,
    input: string,
  ): Promise<string> {
    if (input === '2') {
      state.state = 'initial';
      state.step = 'initial';
      state.data = {};
      return `Agendamento cancelado.\n\n${this.menu()}`;
    }
    if (input !== '1') return 'Responda 1 para confirmar ou 2 para cancelar.';

    const { name, date, time } = state.data;
    if (!name || !date || !time) {
      state.state = 'initial';
      state.step = 'initial';
      state.data = {};
      return `Não consegui recuperar os dados do agendamento. Vamos recomeçar.\n\n${this.menu()}`;
    }

    try {
      const result = await this.calendarService.createAppointment({
        name,
        phone: state.phone,
        date,
        time,
      });
      if (!result.created) {
        if (result.availableSlots.length === 0) {
          state.step = 'appointment_date';
          state.state = 'appointment_date';
          state.data.time = undefined;
          state.data.slots = undefined;
          return 'Esse horário acabou de ficar indisponível e não há outros horários nessa data. Informe outra data.';
        }
        state.step = 'appointment_time';
        state.state = 'appointment_time';
        state.data.time = undefined;
        state.data.slots = result.availableSlots;
        return `Esse horário acabou de ser ocupado.\n\n${this.formatSlots(date, result.availableSlots)}`;
      }

      state.data.calendarEventId = result.eventId;
      state.state = 'initial';
      state.step = 'initial';
      state.data = {};
      return [
        'Agendamento confirmado!',
        '',
        `Cliente: ${name}`,
        `Data: ${this.displayDate(date)}`,
        `Horário: ${time}`,
        '',
        'Em breve estaremos esperando por você.',
        '',
        this.menu(),
      ].join('\n');
    } catch {
      this.logger.error('Google Calendar appointment creation failed');
      return 'Não foi possível confirmar o agendamento porque a agenda está indisponível. Seu horário não foi reservado. Tente novamente em alguns instantes.';
    }
  }

  private formatSlots(date: string, slots: { label: string }[]): string {
    const choices = slots.map((slot, index) => `${index + 1} - ${slot.label}`);
    return [
      `Para ${this.displayDate(date)} estes são os horários disponíveis:`,
      ...choices,
      '',
      'Digite o número do horário desejado.',
    ].join('\n');
  }

  private displayDate(date: string): string {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
  }

  private menu(): string {
    return [
      'Olá! Bem-vindo à Ótica.',
      '',
      'Escolha uma opção:',
      '1 - Agendar atendimento',
      '2 - Perguntar endereço',
    ].join('\n');
  }
}
