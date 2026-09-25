import { Injectable, Logger } from '@nestjs/common';
import { GoogleCalendarService } from '../../google-calendar/google-calendar.service';
import {
  AppointmentConversationOption,
  ConversationState,
} from '../whatsapp.types';
import {
  WhatsAppPersistenceService,
  AppointmentRecord,
} from '../persistence/whatsapp-persistence.service';
import { ConversationStateStore } from './conversation.types';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly stateStore: ConversationStateStore,
    private readonly calendarService: GoogleCalendarService,
    private readonly persistence: WhatsAppPersistenceService,
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

  async processIncomingMessage(
    phone: string,
    message: string,
  ): Promise<string[]> {
    const state = this.getOrCreateState(phone);
    const input = message.trim();
    let replies: string[];

    if (input.toLowerCase() === 'menu' || input === '0') {
      this.reset(state);
      replies = [this.menu()];
    } else if (state.step === 'initial' && (input === '1' || input === '2')) {
      const reminderReply = await this.handleReminderResponse(phone, input);
      replies = reminderReply ?? (await this.handleMenu(state, input));
    } else {
      switch (state.step) {
        case 'appointment_name':
          replies = [await this.handleName(state, input)];
          break;
        case 'appointment_date':
          replies = await this.handleDate(state, input);
          break;
        case 'appointment_time':
          replies = [this.handleTime(state, input)];
          break;
        case 'appointment_confirmation':
          replies = await this.handleConfirmation(state, input);
          break;
        case 'cancel_appointment_selection':
        case 'reschedule_appointment_selection':
          replies = await this.handleAppointmentSelection(state, input);
          break;
        default:
          replies = await this.handleMenu(state, input);
      }
    }

    this.stateStore.set(phone, state);
    return replies;
  }

  private async handleMenu(
    state: ConversationState,
    input: string,
  ): Promise<string[]> {
    switch (input) {
      case '1':
        state.state = 'appointment_name';
        state.step = 'appointment_name';
        state.data = {};
        return ['Vamos agendar seu atendimento. Qual é o seu nome?'];
      case '2':
        this.reset(state);
        return ['Nosso endereço é Rua dos Bobos, nº 0.', this.menu()];
      case '3':
        return this.listAppointments(state);
      case '4':
        return this.beginAppointmentManagement(state, 'reschedule');
      case '5':
        return this.beginAppointmentManagement(state, 'cancel');
      case '6':
        this.reset(state);
        return [
          'Sua solicitação foi registrada no histórico da conversa. A equipe poderá consultá-la.',
          this.menu(),
        ];
      case '7':
        this.reset(state);
        return [
          'Para informações sobre nossos serviços, envie sua dúvida por aqui ou escolha 6 para registrá-la.',
          this.menu(),
        ];
      case '8': {
        this.reset(state);
        const start = process.env.APPOINTMENT_START_TIME;
        const end = process.env.APPOINTMENT_END_TIME;
        const hours =
          start && end
            ? `A agenda permite atendimentos entre ${start} e ${end}.`
            : 'Consulte os horários disponíveis ao escolher 1 - Agendar atendimento.';
        return [hours, 'A disponibilidade varia por data.', this.menu()];
      }
      default:
        return [this.menu()];
    }
  }

  private async handleName(
    state: ConversationState,
    name: string,
  ): Promise<string> {
    if (!name) return 'Por favor, informe seu nome.';
    if (name.length > 150)
      return 'O nome deve ter até 150 caracteres. Envie um nome mais curto.';
    state.data.name = name;
    try {
      await this.persistence.updateCustomerName(state.phone, name);
    } catch {
      this.logger.error('Could not update WhatsApp customer name');
      return 'Não consegui salvar seu nome agora. Tente novamente em alguns instantes.';
    }
    state.state = 'appointment_date';
    state.step = 'appointment_date';
    return 'Qual data você prefere? Informe no formato DD/MM ou DD/MM/AAAA.';
  }

  private async handleDate(
    state: ConversationState,
    input: string,
  ): Promise<string[]> {
    const date = this.calendarService.parseAppointmentDate(input);
    if (!date) {
      return [
        'Essa data não é válida ou está fora dos próximos 30 dias. Informe outra data no formato DD/MM ou DD/MM/AAAA.',
      ];
    }

    try {
      const ignoredEventId =
        state.data.appointmentAction === 'reschedule'
          ? state.data.previousAppointment?.googleEventId
          : undefined;
      const slots = await this.calendarService.getAvailableSlots(
        date,
        ignoredEventId,
      );
      if (slots.length === 0) {
        return [
          `Não há horários disponíveis para ${this.displayDate(date)}. Informe outra data dentro dos próximos 30 dias.`,
        ];
      }
      state.data.date = date;
      state.data.slots = slots;
      state.state = 'appointment_time';
      state.step = 'appointment_time';
      return [this.formatSlots(date, slots)];
    } catch {
      this.logger.error('Google Calendar availability lookup failed');
      return [
        'Não consegui consultar a agenda agora. Tente novamente em alguns instantes.',
      ];
    }
  }

  private handleTime(state: ConversationState, input: string): string {
    const selection = Number(input);
    const selectedSlot = Number.isInteger(selection)
      ? state.data.slots?.[selection - 1]
      : undefined;
    if (!selectedSlot)
      return 'Escolha um dos números da lista de horários disponíveis.';

    state.data.time = selectedSlot.start;
    state.data.slotEnd = selectedSlot.end;
    state.state = 'appointment_confirmation';
    state.step = 'appointment_confirmation';
    return [
      state.data.appointmentAction === 'reschedule'
        ? 'Confirme o reagendamento:'
        : 'Confirme seu agendamento:',
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
  ): Promise<string[]> {
    if (input === '2') {
      const isRescheduling = state.data.appointmentAction === 'reschedule';
      this.reset(state);
      return [
        isRescheduling
          ? 'Reagendamento cancelado. O agendamento original continua confirmado.'
          : 'Agendamento cancelado.',
        this.menu(),
      ];
    }
    if (input !== '1') return ['Responda 1 para confirmar ou 2 para cancelar.'];

    const { name, date, time, slotEnd } = state.data;
    if (!name || !date || !time || !slotEnd) {
      this.reset(state);
      return [
        'Não consegui recuperar os dados do agendamento. Vamos recomeçar.',
        this.menu(),
      ];
    }

    if (state.data.appointmentAction === 'reschedule') {
      return this.confirmReschedule(state, name, date, time, slotEnd);
    }

    try {
      const result = await this.calendarService.createAppointment({
        name,
        phone: state.phone,
        date,
        time,
      });
      if (!result.created)
        return this.returnToAvailableSlots(state, date, result.availableSlots);
      if (!result.eventId) {
        this.logger.error(
          'Google Calendar created an event without returning its ID',
        );
        return [
          'O evento foi criado, mas não recebi o identificador para salvá-lo. A equipe verificará a agenda antes de confirmar.',
        ];
      }

      try {
        await this.persistence.createAppointment({
          phone: state.phone,
          name,
          date,
          start: time,
          end: slotEnd,
          googleEventId: result.eventId,
        });
      } catch {
        this.logger.error(
          'Google Calendar event was created but appointment persistence failed',
        );
        try {
          await this.calendarService.cancelEvent(result.eventId);
        } catch {
          this.logger.error(
            'Could not compensate for an unpersisted Google Calendar event',
          );
        }
        return [
          'Não consegui salvar seu agendamento no sistema. Nenhuma confirmação foi registrada; nossa equipe verificará a agenda.',
        ];
      }

      this.reset(state);
      return [
        [
          'Agendamento confirmado!',
          '',
          `Cliente: ${name}`,
          `Data: ${this.displayDate(date)}`,
          `Horário: ${time}`,
          '',
          'Em breve estaremos esperando por você.',
          this.menu(),
        ].join('\n'),
      ];
    } catch {
      this.logger.error('Google Calendar appointment creation failed');
      return [
        'Não consegui confirmar o agendamento agora. Nossa equipe verificará a agenda antes de uma nova tentativa.',
      ];
    }
  }

  private async confirmReschedule(
    state: ConversationState,
    name: string,
    date: string,
    start: string,
    end: string,
  ): Promise<string[]> {
    const previous = state.data.previousAppointment;
    const rawId = state.data.appointmentId;
    if (!previous || !rawId || !previous.googleEventId) {
      this.reset(state);
      return [
        'Não encontrei o evento original para reagendar. Fale com um atendente.',
        this.menu(),
      ];
    }

    try {
      const result = await this.calendarService.rescheduleEvent(
        previous.googleEventId,
        {
          name,
          phone: state.phone,
          date,
          time: start,
        },
      );
      if (!result.created)
        return this.returnToAvailableSlots(state, date, result.availableSlots);

      try {
        await this.persistence.updateAppointment(BigInt(rawId), state.phone, {
          date,
          start,
          end,
          googleEventId: previous.googleEventId,
        });
      } catch {
        this.logger.error(
          'Google Calendar event was rescheduled but database update failed',
        );
        try {
          await this.calendarService.rescheduleEvent(previous.googleEventId, {
            name,
            phone: state.phone,
            date: previous.date,
            time: previous.start,
          });
        } catch {
          this.logger.error(
            'Could not restore Google Calendar event after database update failure',
          );
        }
        return [
          'Não consegui salvar o reagendamento. O agendamento original foi mantido quando possível; nossa equipe verificará a agenda.',
        ];
      }

      this.reset(state);
      return [
        [
          'Reagendamento confirmado!',
          '',
          `Cliente: ${name}`,
          `Data: ${this.displayDate(date)}`,
          `Horário: ${start}`,
          this.menu(),
        ].join('\n'),
      ];
    } catch {
      this.logger.error('Google Calendar rescheduling failed');
      return [
        'Não consegui concluir o reagendamento. Consulte a equipe antes de fazer uma nova tentativa.',
      ];
    }
  }

  private async listAppointments(state: ConversationState): Promise<string[]> {
    try {
      const appointments = await this.persistence.listFutureAppointments(
        state.phone,
      );
      this.reset(state);
      if (appointments.length === 0) {
        return ['Você não possui atendimentos agendados.', this.menu()];
      }
      const rows = appointments.map(
        (appointment) =>
          `${this.displayDate(appointment.date)} às ${appointment.start} - ${appointment.status}`,
      );
      return [['Seus atendimentos futuros:', ...rows].join('\n'), this.menu()];
    } catch {
      this.logger.error('Could not list future appointments');
      return [
        'Não consegui consultar seus agendamentos agora. Tente novamente.',
        this.menu(),
      ];
    }
  }

  private async beginAppointmentManagement(
    state: ConversationState,
    action: 'cancel' | 'reschedule',
  ): Promise<string[]> {
    try {
      const appointments = await this.persistence.listFutureAppointments(
        state.phone,
      );
      if (appointments.length === 0) {
        this.reset(state);
        return ['Você não possui atendimentos agendados.', this.menu()];
      }
      const choices = appointments.map((appointment) =>
        this.toConversationOption(appointment),
      );
      state.data = { appointments: choices, appointmentAction: action };
      state.step =
        action === 'cancel'
          ? 'cancel_appointment_selection'
          : 'reschedule_appointment_selection';
      state.state = state.step;
      const title =
        action === 'cancel'
          ? 'Qual atendimento deseja cancelar?'
          : 'Qual atendimento deseja reagendar?';
      const rows = choices.map(
        (appointment, index) =>
          `${index + 1} - ${this.displayDate(appointment.date)} às ${appointment.start}`,
      );
      return [[title, ...rows, '', 'Envie 0 ou MENU para voltar.'].join('\n')];
    } catch {
      this.logger.error('Could not load appointments for management');
      this.reset(state);
      return [
        'Não consegui consultar seus agendamentos agora. Tente novamente.',
        this.menu(),
      ];
    }
  }

  private async handleAppointmentSelection(
    state: ConversationState,
    input: string,
  ): Promise<string[]> {
    const index = Number(input);
    const selected = Number.isInteger(index)
      ? state.data.appointments?.[index - 1]
      : undefined;
    if (!selected)
      return ['Escolha um dos números da lista ou envie MENU para voltar.'];

    if (state.data.appointmentAction === 'cancel') {
      try {
        if (!selected.googleEventId) {
          this.reset(state);
          return [
            'Não encontrei o evento correspondente no Google Calendar. Não alterei o registro; fale com um atendente.',
            this.menu(),
          ];
        }
        await this.calendarService.cancelEvent(selected.googleEventId);
        const changed = await this.persistence.cancelAppointment(
          BigInt(selected.id),
          state.phone,
        );
        if (!changed) {
          this.logger.warn(
            'Calendar event cancelled but appointment row was not updated',
          );
          this.reset(state);
          return [
            'O evento do calendário foi cancelado, mas não consegui atualizar o registro. Nossa equipe verificará o histórico.',
          ];
        }
        this.reset(state);
        return ['Seu atendimento foi cancelado.', this.menu()];
      } catch {
        this.logger.error('Appointment cancellation failed');
        return [
          'Não consegui concluir o cancelamento nos dois sistemas. Nossa equipe verificará o estado do evento e do registro.',
        ];
      }
    }

    if (!selected.googleEventId) {
      this.reset(state);
      return [
        'Este atendimento não está vinculado a um evento do Google Calendar e não pode ser reagendado automaticamente.',
        this.menu(),
      ];
    }
    state.data.appointmentId = selected.id;
    state.data.previousAppointment = selected;
    state.data.name = selected.name;
    state.state = 'appointment_date';
    state.step = 'appointment_date';
    return ['Qual nova data você prefere? Informe DD/MM ou DD/MM/AAAA.'];
  }

  private async handleReminderResponse(
    phone: string,
    input: string,
  ): Promise<string[] | null> {
    let appointment: AppointmentRecord | null;
    try {
      appointment =
        await this.persistence.getReminderResponseAppointment(phone);
    } catch {
      this.logger.error(
        'Could not check for a pending appointment reminder response',
      );
      return null;
    }
    if (!appointment) return null;
    if (input === '1') {
      return ['Obrigado por confirmar. Seu atendimento continua agendado.'];
    }

    try {
      if (!appointment.googleEventId) {
        return [
          'Não encontrei o evento correspondente no Google Calendar. Fale com um atendente para concluir o cancelamento.',
        ];
      }
      await this.calendarService.cancelEvent(appointment.googleEventId);
      const cancelled = await this.persistence.cancelAppointment(
        appointment.id,
        phone,
      );
      if (!cancelled) {
        this.logger.warn(
          'Reminder cancellation changed Google Calendar but not the database record',
        );
        return [
          'O evento foi removido do calendário, mas o registro não foi atualizado. Nossa equipe verificará o cancelamento.',
        ];
      }
      return ['Seu atendimento foi cancelado.'];
    } catch {
      this.logger.error('Reminder appointment cancellation failed');
      return [
        'Não consegui concluir o cancelamento nos dois sistemas. Nossa equipe verificará o estado do evento e do registro.',
      ];
    }
  }

  private async returnToAvailableSlots(
    state: ConversationState,
    date: string,
    slots: { start: string; end: string; label: string }[],
  ): Promise<string[]> {
    if (slots.length === 0) {
      state.data.time = undefined;
      state.data.slotEnd = undefined;
      state.data.slots = undefined;
      state.state = 'appointment_date';
      state.step = 'appointment_date';
      return [
        'Esse horário acabou de ficar indisponível e não há outros horários nessa data. Informe outra data.',
      ];
    }
    state.data.time = undefined;
    state.data.slotEnd = undefined;
    state.data.slots = slots;
    state.state = 'appointment_time';
    state.step = 'appointment_time';
    return [
      `Esse horário acabou de ser ocupado.\n\n${this.formatSlots(date, slots)}`,
    ];
  }

  private toConversationOption(
    appointment: AppointmentRecord,
  ): AppointmentConversationOption {
    return {
      id: appointment.id.toString(),
      name: appointment.name,
      date: appointment.date,
      start: appointment.start,
      end: appointment.end,
      ...(appointment.googleEventId
        ? { googleEventId: appointment.googleEventId }
        : {}),
    };
  }

  private formatSlots(date: string, slots: { label: string }[]): string {
    return [
      `Para ${this.displayDate(date)} estes são os horários disponíveis:`,
      ...slots.map((slot, index) => `${index + 1} - ${slot.label}`),
      '',
      'Digite o número do horário desejado.',
    ].join('\n');
  }

  private displayDate(date: string): string {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
  }

  private reset(state: ConversationState): void {
    state.state = 'initial';
    state.step = 'initial';
    state.data = {};
  }

  private menu(): string {
    return [
      'Olá! Bem-vindo à Ótica.',
      '',
      'Escolha uma opção:',
      '1 - Agendar atendimento',
      '2 - Consultar endereço',
      '3 - Meus agendamentos',
      '4 - Reagendar atendimento',
      '5 - Cancelar atendimento',
      '6 - Falar com atendente',
      '7 - Nossos serviços',
      '8 - Horário de funcionamento',
    ].join('\n');
  }
}
