import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService, private readonly auth: AuthService) {}

  @Get('summary')
  async summary(@Req() request: Request) {
    const cookie = (request.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${this.auth.getCookieName()}=`))?.split('=').slice(1).join('=');
    if (!this.auth.isSessionValid(cookie)) throw new UnauthorizedException();
    const [clients, appointments, upcoming, recentClients] = await Promise.all([
      this.prisma.cliente.count(),
      this.prisma.agendamento.count(),
      this.prisma.agendamento.count({ where: { data: { gte: new Date(new Date().toISOString().slice(0, 10)) }, status: 'confirmado' } }),
      this.prisma.cliente.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, nome: true, telefone: true, createdAt: true } }),
    ]);
    return { clients, appointments, upcomingAppointments: upcoming, products: null, sales: null, recentClients: recentClients.map((client) => ({ ...client, id: client.id.toString() })) };
  }
}
