import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly calendar: GoogleCalendarService,
  ) {}

  @Get('summary')
  async summary(@Req() request: Request) {
    this.assertSession(request);
    const [clients, appointments, upcoming, recentClients] = await Promise.all([
      this.prisma.cliente.count(),
      this.prisma.agendamento.count(),
      this.prisma.agendamento.count({ where: { data: { gte: new Date(new Date().toISOString().slice(0, 10)) }, status: 'confirmado' } }),
      this.prisma.cliente.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, nome: true, telefone: true, createdAt: true } }),
    ]);
    return { clients, appointments, upcomingAppointments: upcoming, products: null, sales: null, recentClients: recentClients.map((client) => ({ ...client, id: client.id.toString() })) };
  }

  @Get('appointments/week')
  async appointmentsWeek(@Req() request: Request) {
    this.assertSession(request);
    const dateParts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.calendar.getTimezone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const dateValues = Object.fromEntries(
      dateParts.map(({ type, value }) => [type, value]),
    );
    const date = `${dateValues.year}-${dateValues.month}-${dateValues.day}`;
    const days = await this.calendar.getAppointmentsForWeek(date);
    return {
      days: days.map((day) => ({
        ...day,
        count: day.appointments.length,
      })),
    };
  }

  private assertSession(request: Request): void {
    const cookie = (request.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${this.auth.getCookieName()}=`))
      ?.split('=')
      .slice(1)
      .join('=');
    if (!this.auth.isSessionValid(cookie)) throw new UnauthorizedException();
  }
}
