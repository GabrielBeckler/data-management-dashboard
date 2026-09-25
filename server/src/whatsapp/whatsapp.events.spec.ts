import { Message } from 'whatsapp-web.js';
import { WhatsAppEvents } from './whatsapp.events';
import { WhatsAppClient } from './whatsapp.client';
import { ConversationService } from './conversation/conversation.service';
import { WhatsAppPersistenceService } from './persistence/whatsapp-persistence.service';
import { WhatsAppDelayService } from './delay.service';

describe('WhatsAppEvents', () => {
  it('ignores group chats without persisting or replying', async () => {
    const onMessage = jest.fn();
    const whatsappClient = { onMessage } as unknown as WhatsAppClient;
    const conversation = {
      processIncomingMessage: jest.fn(),
    } as unknown as ConversationService;
    const persistence = {
      saveMessage: jest.fn(),
    } as unknown as WhatsAppPersistenceService;
    const delay = { wait: jest.fn() } as unknown as WhatsAppDelayService;
    const events = new WhatsAppEvents(
      whatsappClient,
      conversation,
      persistence,
      delay,
    );
    events.onModuleInit();

    const handler = onMessage.mock.calls[0][0] as (
      message: Message,
    ) => Promise<void>;
    const reply = jest.fn();
    await handler({
      from: '123456789@g.us',
      body: '1',
      reply,
    } as unknown as Message);

    expect(reply).not.toHaveBeenCalled();
    expect(persistence.saveMessage).not.toHaveBeenCalled();
    expect(conversation.processIncomingMessage).not.toHaveBeenCalled();
  });
});
