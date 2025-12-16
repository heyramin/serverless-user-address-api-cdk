import { handler, setDocClient } from '../../src/handlers/get-addresses';

describe('Get Addresses Handler', () => {
  let mockDocClient: any;

  beforeEach(() => {
    mockDocClient = {
      send: jest.fn(),
    };
    setDocClient(mockDocClient);
    process.env.ADDRESSES_TABLE = 'test-table';
  });

  it('should retrieve all addresses for a user', async () => {
    const mockAddresses = [
      {
        userId: 'user123',
        addressId: 'addr1',
        streetAddress: '123 Main St',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'Australia',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        userId: 'user123',
        addressId: 'addr2',
        street: '456 Oak Ave',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
        country: 'Australia',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    ];

    mockDocClient.send.mockResolvedValueOnce({ Items: mockAddresses });

    const event = {
      pathParameters: { userId: 'user123' },
      queryStringParameters: null,
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(200);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Addresses retrieved successfully');
    expect(body.addresses).toHaveLength(2);
    expect(body.addresses[0].suburb).toBe('Sydney');
  });

  it('should filter addresses by suburb', async () => {
    const mockAddresses = [
      {
        userId: 'user123',
        addressId: 'addr1',
        street: '123 Main St',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'Australia',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    mockDocClient.send.mockResolvedValueOnce({ Items: mockAddresses });

    const event = {
      pathParameters: { userId: 'user123' },
      queryStringParameters: { suburb: 'Sydney' },
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(200);
    const body = JSON.parse((response as any).body);
    expect(body.addresses).toHaveLength(1);
    expect(body.addresses[0].suburb).toBe('Sydney');
  });

  it('should filter addresses by postcode', async () => {
    const mockAddresses = [
      {
        userId: 'user123',
        addressId: 'addr1',
        street: '123 Main St',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'Australia',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    mockDocClient.send.mockResolvedValueOnce({ Items: mockAddresses });

    const event = {
      pathParameters: { userId: 'user123' },
      queryStringParameters: { postcode: '2000' },
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(200);
    const body = JSON.parse((response as any).body);
    expect(body.addresses).toHaveLength(1);
    expect(body.addresses[0].postcode).toBe('2000');
  });

  it('should return 400 for missing userId', async () => {
    const event = {
      pathParameters: {},
      queryStringParameters: null,
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(400);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Missing userId');
  });

  it('should return empty array when no addresses exist', async () => {
    mockDocClient.send.mockResolvedValueOnce({ Items: [] });

    const event = {
      pathParameters: { userId: 'user123' },
      queryStringParameters: null,
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(200);
    const body = JSON.parse((response as any).body);
    expect(body.addresses).toHaveLength(0);
  });
});
