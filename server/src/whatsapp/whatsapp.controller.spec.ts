import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

describe('WhatsAppController', () => {
  let controller: WhatsAppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppController],
      providers: [
        {
          provide: WhatsAppService,
          useValue: {
            getStatus: jest.fn().mockReturnValue({
              connected: false,
              ready: false,
              status: 'disconnected',
            }),
            connect: jest.fn(),
            disconnect: jest.fn(),
            sendMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = app.get<WhatsAppController>(WhatsAppController);
  });

  it('should return the basic WhatsApp status payload', () => {
    expect(controller.getStatus()).toEqual({
      connected: false,
      ready: false,
      status: 'disconnected',
    });
  });
});
