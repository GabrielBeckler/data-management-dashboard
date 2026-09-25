import { WhatsAppPersistenceService } from './whatsapp-persistence.service';

const customer = {
  id: 2n,
  nome: 'Cliente WhatsApp',
  telefone: '5531999999999',
  email: null,
  dataNascimento: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('WhatsAppPersistenceService', () => {
  const prisma = {
    cliente: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    mensagem: { create: jest.fn() },
    agendamento: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
    lembrete: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  let service: WhatsAppPersistenceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WhatsAppPersistenceService(prisma as never);
  });

  it('normalizes masked and local Brazilian telephone numbers', () => {
    expect(service.normalizePhone('(31) 99999-9999')).toBe('5531999999999');
    expect(service.normalizePhone('+55 31 99999-9999')).toBe('5531999999999');
  });

  it('reuses an existing customer by canonical phone', async () => {
    prisma.cliente.findUnique.mockResolvedValue(customer);
    const result = await service.ensureCustomer('(31) 99999-9999');
    expect(result).toEqual(customer);
    expect(prisma.cliente.create).not.toHaveBeenCalled();
  });

  it('creates a customer when a phone is new', async () => {
    prisma.cliente.findUnique.mockResolvedValue(null);
    prisma.cliente.findFirst.mockResolvedValue(null);
    prisma.cliente.create.mockResolvedValue(customer);
    await service.ensureCustomer('31 99999-9999', 'Ana');
    expect(prisma.cliente.create).toHaveBeenCalledWith({
      data: { telefone: '5531999999999', nome: 'Ana' },
    });
  });

  it.each(['entrada', 'saida'] as const)(
    'stores %s text messages against the customer',
    async (direction) => {
      prisma.cliente.findUnique.mockResolvedValue(customer);
      prisma.mensagem.create.mockResolvedValue({});
      await service.saveMessage(customer.telefone, 'Oi', direction);
      expect(prisma.mensagem.create).toHaveBeenCalledWith({
        data: {
          clienteId: customer.id,
          telefone: customer.telefone,
          mensagem: 'Oi',
          direcao: direction,
          tipo: 'texto',
        },
      });
    },
  );

  it('updates a booking and resets its unique reminder in one transaction', async () => {
    const transaction = {
      agendamento: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      lembrete: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    prisma.$transaction.mockImplementation(async (callback: never) =>
      (callback as (value: typeof transaction) => Promise<void>)(transaction),
    );

    await service.updateAppointment(5n, customer.telefone, {
      date: '2026-10-01',
      start: '10:00',
      end: '11:00',
    });

    expect(transaction.lembrete.updateMany).toHaveBeenCalledWith({
      where: { agendamentoId: 5n, tipo: 'appointment_reminder_1_day' },
      data: { enviado: false, enviadoEm: null },
    });
  });

  it('claims a unique reminder only once', async () => {
    prisma.lembrete.upsert.mockResolvedValue({ id: 8n });
    prisma.lembrete.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.claimReminder(4n)).resolves.toBeNull();
    expect(prisma.lembrete.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          agendamentoId_tipo: {
            agendamentoId: 4n,
            tipo: 'appointment_reminder_1_day',
          },
        },
      }),
    );
  });
});
