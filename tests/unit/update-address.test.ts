import { handler, setDocClient } from '../../src/handlers/update-address';

describe('Update Address Handler', () => {
  let mockDocClient: any;

  beforeEach(() => {
    mockDocClient = {
      send: jest.fn(),
    };
    setDocClient(mockDocClient);
    process.env.ADDRESSES_TABLE = 'test-table';
  });

  it('should update an address with new values', async () => {
    const updatedAddress = {
      userId: 'user123',
      addressId: '550e8400-e29b-41d4-a716-446655440000',
      streetAddress: '789 New St',
      suburb: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      country: 'Australia',
      addressType: 'mailing',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T12:00:00Z',
    };

    mockDocClient.send.mockResolvedValueOnce({ Attributes: updatedAddress });

    const event = {
      pathParameters: { userId: 'user123', addressId: '550e8400-e29b-41d4-a716-446655440000' },
      body: JSON.stringify({
        streetAddress: '789 New St',
        addressType: 'mailing',
      }),
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(200);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Address updated successfully');
    expect(body.addressId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(body.address.streetAddress).toBe('789 New St');
  });

  it('should return 400 when no fields to update', async () => {
    const event = {
      pathParameters: { userId: 'user123', addressId: '550e8400-e29b-41d4-a716-446655440000' },
      body: JSON.stringify({}),
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(400);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('"value" must have at least 1 key');
  });

  it('should return 400 for missing userId', async () => {
    const event = {
      pathParameters: { addressId: '550e8400-e29b-41d4-a716-446655440000' },
      body: JSON.stringify({ suburb: 'Melbourne' }),
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(400);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Missing userId or addressId');
  });

  it('should return 400 for missing addressId', async () => {
    const event = {
      pathParameters: { userId: 'user123' },
      body: JSON.stringify({ suburb: 'Melbourne' }),
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(400);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Missing userId or addressId');
  });

  it('should update multiple fields', async () => {
    const updatedAddress = {
      userId: 'user123',
      addressId: '550e8400-e29b-41d4-a716-446655440000',
      streetAddress: '789 New St',
      suburb: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
      country: 'Australia',
      addressType: 'business',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T12:00:00Z',
    };

    mockDocClient.send.mockResolvedValueOnce({ Attributes: updatedAddress });

    const event = {
      pathParameters: { userId: 'user123', addressId: '550e8400-e29b-41d4-a716-446655440000' },
      body: JSON.stringify({
        streetAddress: '789 New St',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
        addressType: 'business',
      }),
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(200);
    const body = JSON.parse((response as any).body);
    expect(body.address.suburb).toBe('Melbourne');
    expect(body.address.state).toBe('VIC');
    expect(body.address.postcode).toBe('3000');
  });
});
