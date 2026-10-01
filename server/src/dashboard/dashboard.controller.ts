import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';

class ClientDto {
  @IsString() @MinLength(1) @MaxLength(150) nome!: string;
  @IsString() @MinLength(8) @MaxLength(30) telefone!: string;
  @IsOptional() @IsEmail() @MaxLength(150) email?: string | null;
  @IsOptional() @IsString() @MaxLength(255) endereco?: string | null;
  @IsOptional() @IsInt() @Min(1) @Max(5) avaliacao?: number | null;
  @IsOptional() @IsString() relatorioAvaliacao?: string | null;
}

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

  @Get('clients')
  async clients(@Req() request: Request) {
    this.assertSession(request);
    const clients = await this.prisma.cliente.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        agendamentos: {
          orderBy: [{ data: 'desc' }, { horaInicio: 'desc' }],
          take: 1,
          select: { status: true },
        },
      },
    });
    return clients.map((client) => ({
      id: client.id.toString(),
      nome: client.nome,
      email: client.email,
      telefone: client.telefone,
      endereco: client.endereco,
      atendimento: client.agendamentos[0]?.status ?? null,
      avaliacao: client.avaliacao,
      relatorioAvaliacao: client.relatorioAvaliacao,
    }));
  }

  @Get('clients/:id')
  async client(@Req() request: Request, @Param('id') id: string) {
    this.assertSession(request);
    const client = await this.prisma.cliente.findUnique({ where: { id: this.parseClientId(id) } });
    if (!client) throw new NotFoundException('Cliente não encontrado.');
    return this.serializeClient(client);
  }

  @Post('clients')
  async createClient(@Req() request: Request, @Body() body: ClientDto) {
    this.assertSession(request);
    try {
      const client = await this.prisma.cliente.create({ data: this.clientData(body) });
      return this.serializeClient(client);
    } catch (error) {
      this.rethrowUniquePhone(error);
      throw error;
    }
  }

  @Patch('clients/:id')
  async updateClient(@Req() request: Request, @Param('id') id: string, @Body() body: ClientDto) {
    this.assertSession(request);
    const clientId = this.parseClientId(id);
    try {
      const client = await this.prisma.cliente.update({ where: { id: clientId }, data: { ...this.clientData(body), updatedAt: new Date() } });
      return this.serializeClient(client);
    } catch (error) {
      this.rethrowUniquePhone(error);
      if (this.isPrismaError(error, 'P2025')) throw new NotFoundException('Cliente não encontrado.');
      throw error;
    }
  }

  @Delete('clients/:id')
  async deleteClient(@Req() request: Request, @Param('id') id: string) {
    this.assertSession(request);
    const clientId = this.parseClientId(id);
    const client = await this.prisma.cliente.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) throw new NotFoundException('Cliente não encontrado.');
    const [appointments, messages] = await Promise.all([
      this.prisma.agendamento.count({ where: { clienteId: clientId } }),
      this.prisma.mensagem.count({ where: { clienteId: clientId } }),
    ]);
    if (appointments || messages) {
      throw new ConflictException('Este cliente possui histórico de atendimentos ou mensagens e não pode ser excluído.');
    }
    await this.prisma.cliente.delete({ where: { id: clientId } });
    return { success: true };
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

  private parseClientId(id: string): bigint {
    if (!/^\d+$/.test(id)) throw new BadRequestException('ID de cliente inválido.');
    return BigInt(id);
  }

  private clientData(body: ClientDto) {
    const digits = body.telefone.replace(/\D/g, '').replace(/^0+/, '');
    const telefone =
      digits.length === 10 || digits.length === 11
        ? `55${digits}`
        : digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
          ? digits
          : null;
    if (!telefone) {
      throw new BadRequestException('Informe um telefone brasileiro válido com DDD.');
    }
    return {
      nome: body.nome.trim(),
      telefone,
      email: body.email?.trim().toLowerCase() || null,
      endereco: body.endereco?.trim() || null,
      avaliacao: body.avaliacao ?? null,
      relatorioAvaliacao: body.relatorioAvaliacao?.trim() || null,
    };
  }

  private serializeClient(client: { id: bigint; nome: string; telefone: string; email: string | null; endereco: string | null; avaliacao: number | null; relatorioAvaliacao: string | null }) {
    return { ...client, id: client.id.toString() };
  }

  private rethrowUniquePhone(error: unknown): void {
    if (this.isPrismaError(error, 'P2002')) throw new ConflictException('Este telefone já está cadastrado para outro cliente.');
  }

  private isPrismaError(error: unknown, code: string): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
  }
}
