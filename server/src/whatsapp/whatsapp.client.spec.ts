import { EventEmitter } from 'events';
import { WhatsAppClient } from './whatsapp.client';

jest.mock('whatsapp-web.js', () => {
  class MockClient extends EventEmitter {
    initialize = jest.fn(async () => undefined);
    destroy = jest.fn(async () => undefined);
    getContactById = jest.fn();
    sendMessage = jest.fn();
    on = super.on.bind(this);
  }

  return {
    Client: MockClient,
    LocalAuth: class MockLocalAuth {},
    MessageMedia: class MockMessageMedia {},
  };
});

describe('WhatsAppClient', () => {
  it('should resolve with qr status when QR code is generated during connection', async () => {
    const client = new WhatsAppClient();
    const mockedClient = (client as any).client;

    mockedClient.initialize.mockImplementation(async () => {
      setTimeout(() => mockedClient.emit('qr', 'sample-qr-code'), 0);
      return undefined;
    });

    await expect(client.connect()).resolves.toMatchObject({
      status: 'qr_available',
      qrCode: 'sample-qr-code',
    });
  });

  it('should recreate the client after initialization fails', async () => {
    const client = new WhatsAppClient();
    const failedClient = (client as any).client;
    failedClient.initialize.mockRejectedValueOnce(new Error('launch failed'));

    await expect(client.connect()).rejects.toThrow('launch failed');
    expect(client.getStatus().status).toBe('disconnected');

    const retryPromise = client.connect();
    const retryClient = (client as any).client;
    retryClient.emit('qr', 'retry-qr-code');

    await expect(retryPromise).resolves.toMatchObject({
      status: 'qr_available',
      qrCode: 'retry-qr-code',
    });
    expect(failedClient.initialize).toHaveBeenCalledTimes(1);
  });

  it('should initialize only once for concurrent connect calls', async () => {
    const client = new WhatsAppClient();
    const mockedClient = (client as any).client;
    mockedClient.initialize.mockImplementation(async () => {
      setTimeout(() => mockedClient.emit('qr', 'shared-qr-code'), 0);
    });

    const firstConnect = client.connect();
    const secondConnect = client.connect();

    await expect(Promise.all([firstConnect, secondConnect])).resolves.toEqual([
      expect.objectContaining({ status: 'qr_available' }),
      expect.objectContaining({ status: 'qr_available' }),
    ]);
    expect(mockedClient.initialize).toHaveBeenCalledTimes(1);
  });
});
