jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

import { handler, setDynamoDBClient } from '../../src/handlers/init-client';

describe('Init Client Handler', () => {
  let mockDynamoDBClient: any;

  beforeEach(() => {
    mockDynamoDBClient = {
      send: jest.fn().mockResolvedValue({}),
    };
    setDynamoDBClient(mockDynamoDBClient);
    process.env.CLIENT_TABLE_NAME = 'test-clients-table';
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
    expect(mockDynamoDBClient.send).toHaveBeenCalled();
  });

  it('should create client without description', async () => {
    const event = {
      clientName: 'Minimal Client',
    };

    const response = await handler(event);

    expect(response.message).toBe('Client created successfully');
    expect(response.clientId).toBeDefined();
    expect(response.clientSecret).toBeDefined();
    expect(mockDynamoDBClient.send).toHaveBeenCalled();
  });

  it('should return error for missing clientName', async () => {
    const event = {
      description: 'No client name',
    } as any;

    const response = await handler(event);

    expect(response.error).toBe('clientName is required');
  });

  it('should store hashed secret in database', async () => {
    const event = {
      clientName: 'Test Client',
    };

    await handler(event);

    expect(mockDynamoDBClient.send).toHaveBeenCalled();
    const callArgs = mockDynamoDBClient.send.mock.calls[0][0];
    const storedItem = callArgs.input.Item;

    // Verify the stored secret is hashed (not plain text)
    expect(storedItem.clientSecret).toBeDefined();
    expect(storedItem.clientSecret.length).toBe(64); // SHA-256 hex length
    expect(storedItem.active).toBe(true);
    expect(storedItem.createdAt).toBeDefined();
    expect(storedItem.expiresAt).toBeDefined();
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

  it('should handle API Gateway invocation', async () => {
    const event = {
      body: JSON.stringify({
        clientName: 'API Gateway Client',
      }),
    } as any;

    const response = await handler(event);

    expect(response.message).toBe('Client created successfully');
    expect(response.statusCode).toBeUndefined(); // Direct invocation returns object without statusCode
    expect(mockDynamoDBClient.send).toHaveBeenCalled();
  });
});
