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
      pathParameters: { userId: 'user123' },
      body: JSON.stringify({
        streetAddress: '123 Main St',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      }),
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(201);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Address created successfully');
    expect(body.addressId).toBeDefined();
    expect(body.address.userId).toBe('user123');
    expect(body.address.suburb).toBe('Sydney');
  });

  it('should return 400 for missing required fields', async () => {
    const event = {
      pathParameters: { userId: 'user123' },
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
      pathParameters: { userId: 'user123' },
      body: JSON.stringify({
        streetAddress: '123 Main St',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      }),
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(201);
    const body = JSON.parse((response as any).body);
    expect(body.address.country).toBe('Australia');
  });
});
