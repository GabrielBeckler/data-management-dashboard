import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const REMINDER_TYPE = 'appointment_reminder_1_day';
const CANCELLED_STATUSES = ['cancelado', 'cancelada', 'cancelled'];

export interface AppointmentRecord {
  id: bigint;
  clientId: bigint;
  googleEventId: string | null;
  name: string;
  phone: string;
  date: string;
  start: string;
  end: string;
  status: string;
}

@Injectable()
export class WhatsAppPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  normalizePhone(phone: string): string {
    let digits = phone.replace(/\D/g, '').replace(/^0+/, '');
    if (!digits.startsWith('55')) digits = `55${digits}`;
    return digits;
  }

  async ensureCustomer(phone: string, name?: string) {
    const normalized = this.normalizePhone(phone);
    const nationalNumber = normalized.startsWith('55')
      ? normalized.slice(2)
      : normalized;
    let customer = await this.prisma.cliente.findUnique({
      where: { telefone: normalized },
    });
    if (!customer && nationalNumber) {
      customer = await this.prisma.cliente.findFirst({
        where: { telefone: { endsWith: nationalNumber } },
      });
    }

    const displayName = name?.trim();
    if (customer) {
      const update: { telefone?: string; nome?: string; updatedAt: Date } = {
        updatedAt: new Date(),
      };
      if (customer.telefone !== normalized) update.telefone = normalized;
      if (displayName && displayName !== customer.nome)
        update.nome = displayName;
      if (Object.keys(update).length === 1) return customer;
      return this.prisma.cliente.update({
        where: { id: customer.id },
        data: update,
      });
    }

    try {
      return await this.prisma.cliente.create({
        data: {
          telefone: normalized,
          nome: displayName || 'Cliente WhatsApp',
        },
      });
    } catch (error) {
      // Handle a simultaneous first message for the same phone via the DB's unique key.
      const racedCustomer = await this.prisma.cliente.findUnique({
        where: { telefone: normalized },
      });
      if (racedCustomer) return racedCustomer;
      throw error;
    }
  }

  async updateCustomerName(phone: string, name: string): Promise<void> {
    await this.ensureCustomer(phone, name);
  }

  async saveMessage(
    phone: string,
    message: string,
    direction: 'entrada' | 'saida',
  ): Promise<void> {
    const customer = await this.ensureCustomer(phone);
    await this.prisma.mensagem.create({
      data: {
        clienteId: customer.id,
        telefone: customer.telefone,
        mensagem: message,
        direcao: direction,
        tipo: 'texto',
      },
    });
  }

  async createAppointment(input: {
    phone: string;
    name: string;
    date: string;
    start: string;
    end: string;
    googleEventId: string;
    observations?: string;
  }): Promise<bigint> {
    const customer = await this.ensureCustomer(input.phone, input.name);
    const appointment = await this.prisma.agendamento.create({
      data: {
        clienteId: customer.id,
        googleEventId: input.googleEventId,
        data: this.toDbDate(input.date),
        horaInicio: this.toDbTime(input.start),
        horaFim: this.toDbTime(input.end),
        status: 'confirmado',
        observacoes:
          input.observations ?? 'Agendamento realizado pelo WhatsApp.',
      },
    });
    return appointment.id;
  }

  async listFutureAppointments(phone: string): Promise<AppointmentRecord[]> {
    const normalized = this.normalizePhone(phone);
    const customer = await this.findCustomerByPhone(normalized);
    if (!customer) return [];
    const appointments = await this.prisma.agendamento.findMany({
      where: {
        clienteId: customer.id,
        data: { gte: this.todayDate() },
        status: { notIn: CANCELLED_STATUSES },
      },
      include: { cliente: true },
      orderBy: [{ data: 'asc' }, { horaInicio: 'asc' }],
    });
    return appointments
      .map((appointment) => this.toRecord(appointment))
      .filter((appointment) => this.isFutureAppointment(appointment));
  }

  async getAppointment(
    id: bigint,
    phone: string,
  ): Promise<AppointmentRecord | null> {
    const normalized = this.normalizePhone(phone);
    const appointment = await this.prisma.agendamento.findFirst({
      where: {
        id,
        cliente: { telefone: normalized },
      },
      include: { cliente: true },
    });
    return appointment ? this.toRecord(appointment) : null;
  }

  async updateAppointment(
    id: bigint,
    phone: string,
    input: { date: string; start: string; end: string; googleEventId?: string },
  ): Promise<void> {
    const normalized = this.normalizePhone(phone);
    await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.agendamento.updateMany({
        where: {
          id,
          cliente: { telefone: normalized },
          status: { notIn: CANCELLED_STATUSES },
        },
        data: {
          data: this.toDbDate(input.date),
          horaInicio: this.toDbTime(input.start),
          horaFim: this.toDbTime(input.end),
          ...(input.googleEventId
            ? { googleEventId: input.googleEventId }
            : {}),
          updatedAt: new Date(),
        },
      });
      if (updated.count !== 1)
        throw new Error('Appointment record was not updated.');

      await transaction.lembrete.updateMany({
        where: { agendamentoId: id, tipo: REMINDER_TYPE },
        data: { enviado: false, enviadoEm: null },
      });
    });
  }

  async cancelAppointment(id: bigint, phone: string): Promise<boolean> {
    const normalized = this.normalizePhone(phone);
    const result = await this.prisma.agendamento.updateMany({
      where: {
        id,
        cliente: { telefone: normalized },
        status: { notIn: CANCELLED_STATUSES },
      },
      data: { status: 'cancelado', updatedAt: new Date() },
    });
    return result.count === 1;
  }

  async getTomorrowAppointmentsForReminder(): Promise<AppointmentRecord[]> {
    const tomorrow = this.addDays(this.todayDate(), 1);
    const dayAfter = this.addDays(tomorrow, 1);
    const appointments = await this.prisma.agendamento.findMany({
      where: {
        data: { gte: tomorrow, lt: dayAfter },
        status: 'confirmado',
      },
      include: { cliente: true },
      orderBy: [{ data: 'asc' }, { horaInicio: 'asc' }],
    });
    return appointments.map((appointment) => this.toRecord(appointment));
  }

  async claimReminder(appointmentId: bigint): Promise<bigint | null> {
    const reminder = await this.prisma.lembrete.upsert({
      where: {
        agendamentoId_tipo: {
          agendamentoId: appointmentId,
          tipo: REMINDER_TYPE,
        },
      },
      create: {
        agendamentoId: appointmentId,
        tipo: REMINDER_TYPE,
        enviado: false,
      },
      update: {},
    });
    const claim = await this.prisma.lembrete.updateMany({
      where: { id: reminder.id, enviado: false },
      data: { enviado: true, enviadoEm: new Date() },
    });
    return claim.count === 1 ? reminder.id : null;
  }

  async releaseReminderClaim(id: bigint): Promise<void> {
    await this.prisma.lembrete.updateMany({
      where: { id, enviado: true },
      data: { enviado: false, enviadoEm: null },
    });
  }

  async markReminderSent(id: bigint): Promise<void> {
    await this.prisma.lembrete.update({
      where: { id },
      data: { enviado: true, enviadoEm: new Date() },
    });
  }

  async getReminderResponseAppointment(
    phone: string,
  ): Promise<AppointmentRecord | null> {
    const normalized = this.normalizePhone(phone);
    const startOfToday = this.todayDate();
    const reminder = await this.prisma.lembrete.findFirst({
      where: {
        tipo: REMINDER_TYPE,
        enviado: true,
        enviadoEm: { gte: startOfToday },
        agendamento: {
          status: 'confirmado',
          data: { gte: startOfToday },
          cliente: { telefone: normalized },
        },
      },
      include: { agendamento: { include: { cliente: true } } },
      orderBy: { enviadoEm: 'desc' },
    });
    return reminder ? this.toRecord(reminder.agendamento) : null;
  }

  private async findCustomerByPhone(phone: string) {
    const nationalNumber = phone.startsWith('55') ? phone.slice(2) : phone;
    return (
      (await this.prisma.cliente.findUnique({ where: { telefone: phone } })) ??
      this.prisma.cliente.findFirst({
        where: { telefone: { endsWith: nationalNumber } },
      })
    );
  }

  private toRecord(appointment: {
    id: bigint;
    clienteId: bigint;
    googleEventId: string | null;
    data: Date;
    horaInicio: Date;
    horaFim: Date;
    status: string;
    cliente: { nome: string; telefone: string };
  }): AppointmentRecord {
    return {
      id: appointment.id,
      clientId: appointment.clienteId,
      googleEventId: appointment.googleEventId,
      name: appointment.cliente.nome,
      phone: appointment.cliente.telefone,
      date: appointment.data.toISOString().slice(0, 10),
      start: this.fromDbTime(appointment.horaInicio),
      end: this.fromDbTime(appointment.horaFim),
      status: appointment.status,
    };
  }

  private toDbDate(date: string): Date {
    return new Date(`${date}T00:00:00.000Z`);
  }

  private toDbTime(time: string): Date {
    const [hour, minute] = time.split(':').map(Number);
    return new Date(Date.UTC(1970, 0, 1, hour, minute));
  }

  private fromDbTime(time: Date): string {
    return `${String(time.getUTCHours()).padStart(2, '0')}:${String(time.getUTCMinutes()).padStart(2, '0')}`;
  }

  private isFutureAppointment(appointment: AppointmentRecord): boolean {
    const today = this.todayDate().toISOString().slice(0, 10);
    if (appointment.date > today) return true;
    if (appointment.date < today) return false;
    const nowParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: process.env.CALENDAR_TIMEZONE || 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (type: string) =>
      Number(nowParts.find((part) => part.type === type)?.value);
    return (
      appointment.start >
      `${String(get('hour')).padStart(2, '0')}:${String(get('minute')).padStart(2, '0')}`
    );
  }

  private todayDate(): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: process.env.CALENDAR_TIMEZONE || 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const get = (type: string) =>
      parts.find((part) => part.type === type)?.value;
    return new Date(
      `${get('year')}-${get('month')}-${get('day')}T00:00:00.000Z`,
    );
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }
}
