import { WhatsAppDelayService } from './delay.service';

describe('WhatsAppDelayService', () => {
  const previous = process.env.WHATSAPP_RESPONSE_DELAY_MS;

  afterEach(() => {
    if (previous === undefined) delete process.env.WHATSAPP_RESPONSE_DELAY_MS;
    else process.env.WHATSAPP_RESPONSE_DELAY_MS = previous;
    jest.useRealTimers();
  });

  it('waits for the configured delay without blocking the event loop', async () => {
    jest.useFakeTimers();
    process.env.WHATSAPP_RESPONSE_DELAY_MS = '800';
    const promise = new WhatsAppDelayService().wait();
    expect(jest.getTimerCount()).toBe(1);
    await jest.advanceTimersByTimeAsync(800);
    await expect(promise).resolves.toBeUndefined();
  });

  it('can be disabled with zero', async () => {
    jest.useFakeTimers();
    process.env.WHATSAPP_RESPONSE_DELAY_MS = '0';
    await new WhatsAppDelayService().wait();
    expect(jest.getTimerCount()).toBe(0);
  });
});
