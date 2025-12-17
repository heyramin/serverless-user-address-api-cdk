import { handler, setDocClient } from '../../src/handlers/delete-address';

describe('Delete Address Handler', () => {
  let mockDocClient: any;

  beforeEach(() => {
    mockDocClient = {
      send: jest.fn(),
    };
    setDocClient(mockDocClient);
    process.env.ADDRESSES_TABLE = 'test-table';
  });

  it('should delete an address successfully', async () => {
    mockDocClient.send.mockResolvedValueOnce({});

    const event = {
      pathParameters: { userId: 'user_123', addressId: '550e8400-e29b-41d4-a716-446655440000' },
      body: null,
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(204);
    expect((response as any).body).toBe('');
  });

  it('should return 400 for missing userId', async () => {
    const event = {
      pathParameters: { addressId: '550e8400-e29b-41d4-a716-446655440000' },
      body: null,
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(400);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Missing userId or addressId');
  });

  it('should return 400 for missing addressId', async () => {
    const event = {
      pathParameters: { userId: 'user123' },
      body: null,
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(400);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Missing userId or addressId');
  });

  it('should return 400 when both userId and addressId are missing', async () => {
    const event = {
      pathParameters: {},
      body: null,
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(400);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Missing userId or addressId');
  });
});
