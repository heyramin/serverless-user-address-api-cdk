import { handler, setDocClient } from '../../src/handlers/store-address';

describe('Store Address Handler', () => {
  let mockDocClient: any;

  beforeEach(() => {
    mockDocClient = {
      send: jest.fn(),
    };
    setDocClient(mockDocClient);
    process.env.ADDRESSES_TABLE = 'test-table';
  });

  it('should store a valid address', async () => {
    mockDocClient.send.mockResolvedValueOnce({});

    const event = {
      pathParameters: { userId: 'user_123' },
      body: JSON.stringify({
        streetAddress: '123 Main St',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        addressType: 'residential',
      }),
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(201);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Address created successfully');
    expect(body.addressId).toBeDefined();
    expect(body.address.userId).toBe('user_123');
    expect(body.address.suburb).toBe('Sydney');
  });

  it('should return 400 for missing required fields', async () => {
    const event = {
      pathParameters: { userId: 'user_123' },
      body: JSON.stringify({
        streetAddress: '123 Main St',
      }),
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(400);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Validation failed');
  });

  it('should return 400 for missing userId', async () => {
    const event = {
      pathParameters: {},
      body: JSON.stringify({
        streetAddress: '123 Main St',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      }),
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(400);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Missing userId');
  });

  it('should default country to Australia', async () => {
    mockDocClient.send.mockResolvedValueOnce({});

    const event = {
      pathParameters: { userId: 'user_123' },
      body: JSON.stringify({
        streetAddress: '123 Main St',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        addressType: 'residential',
      }),
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(201);
    const body = JSON.parse((response as any).body);
    expect(body.address.country).toBe('Australia');
  });

  it('should return 409 for duplicate address', async () => {
    const existingAddress = {
      userId: 'user_123',
      addressId: 'existing-id',
      streetAddress: '123 Main St',
      suburb: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      country: 'Australia',
      addressType: 'residential',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    // Mock QueryCommand response with existing address
    mockDocClient.send.mockResolvedValueOnce({
      Items: [existingAddress],
    });

    const event = {
      pathParameters: { userId: 'user_123' },
      body: JSON.stringify({
        streetAddress: '123 Main St',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'Australia',
        addressType: 'residential',
      }),
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(409);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('An identical address already exists for this user');
    expect(body.error).toBe('DUPLICATE_ADDRESS');
  });

  it('should allow same street address for different users', async () => {
    const existingAddress = {
      userId: 'other_user',
      addressId: 'other-id',
      streetAddress: '123 Main St',
      suburb: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      country: 'Australia',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    // First call: QueryCommand returns other user's address
    // Second call: PutCommand succeeds
    mockDocClient.send
      .mockResolvedValueOnce({ Items: [existingAddress] })
      .mockResolvedValueOnce({});

    const event = {
      pathParameters: { userId: 'user_123' },
      body: JSON.stringify({
        streetAddress: '123 Main St',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'Australia',
      }),
    } as any;

    const response = await (handler as any)(event);

    // Should succeed because it's a different user
    expect((response as any).statusCode).toBe(201);
    const body = JSON.parse((response as any).body);
    expect(body.address.userId).toBe('user_123');
  });
});
