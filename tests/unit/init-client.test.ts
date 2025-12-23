jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

jest.mock('../../src/db/clients');

import { handler } from '../../src/handlers/init-client';
import * as dbClients from '../../src/db/clients';

describe('Init Client Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLIENT_TABLE_NAME = 'test-clients-table';
    (dbClients.createClient as jest.Mock).mockResolvedValue(undefined);
  });

  it('should create a new client with valid request', async () => {
    const event = {
      clientName: 'Test Client',
      description: 'A test client',
    };

    const response = await handler(event);

    expect(response.message).toBe('Client created successfully');
    expect(response.clientId).toBeDefined();
    expect(response.clientSecret).toBeDefined();
    expect(response.clientName).toBe('Test Client');
    expect(response.createdAt).toBeDefined();
    expect(response.warning).toBe('Save the clientSecret now - it cannot be retrieved later');
    expect(dbClients.createClient).toHaveBeenCalled();
  });

  it('should create client without description', async () => {
    const event = {
      clientName: 'Minimal Client',
    };

    const response = await handler(event);

    expect(response.message).toBe('Client created successfully');
    expect(response.clientId).toBeDefined();
    expect(response.clientSecret).toBeDefined();
    expect(dbClients.createClient).toHaveBeenCalled();
  });

  it('should return error for missing clientName', async () => {
    const event = {
      description: 'No client name',
    } as any;

    await expect(handler(event)).rejects.toThrow('clientName is required');
  });

  it('should store hashed secret in database', async () => {
    const event = {
      clientName: 'Test Client',
    };

    await handler(event);

    expect(dbClients.createClient).toHaveBeenCalled();
    const callArgs = (dbClients.createClient as jest.Mock).mock.calls[0][0];

    // Verify the stored secret is hashed (not plain text)
    expect(callArgs.clientSecret).toBeDefined();
    expect(callArgs.clientSecret.length).toBe(64); // SHA-256 hex length
    expect(callArgs.active).toBe(true);
    expect(callArgs.createdAt).toBeDefined();
    expect(callArgs.expiresAt).toBeDefined();
  });

  it('should generate valid Basic auth header', async () => {
    const event = {
      clientName: 'Auth Test',
    };

    const response = await handler(event);

    // Verify usage format is correct
    expect(response.usage).toMatch(/^Authorization: Basic /);
    // Verify the Basic auth can be decoded
    const base64Part = response.usage.split(' ')[2];
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
    expect(decoded).toContain(response.clientId);
    expect(decoded).toContain(response.clientSecret);
  });

  it('should handle direct Lambda invocation', async () => {
    const event = {
      clientName: 'Direct Lambda Client',
    };

    const response = await handler(event);

    expect(response.message).toBe('Client created successfully');
    expect(response.clientId).toBeDefined();
    expect(response.clientSecret).toBeDefined();
    expect(dbClients.createClient).toHaveBeenCalled();
  });
});
