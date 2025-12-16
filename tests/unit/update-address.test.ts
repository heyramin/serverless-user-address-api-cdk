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
      addressId: 'addr1',
      streetAddress: '789 New St',
      suburb: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      country: 'Australia',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T12:00:00Z',
    };

    mockDocClient.send.mockResolvedValueOnce({ Attributes: updatedAddress });

    const event = {
      pathParameters: { userId: 'user123', addressId: 'addr1' },
      body: JSON.stringify({
        streetAddress: '789 New St',
      }),
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(200);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Address updated successfully');
    expect(body.addressId).toBe('addr1');
    expect(body.address.streetAddress).toBe('789 New St');
  });

  it('should return 400 when no fields to update', async () => {
    const event = {
      pathParameters: { userId: 'user123', addressId: 'addr1' },
      body: JSON.stringify({}),
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(400);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('No fields to update');
  });

  it('should return 400 for missing userId', async () => {
    const event = {
      pathParameters: { addressId: 'addr1' },
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
      addressId: 'addr1',
      streetAddress: '789 New St',
      suburb: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
      country: 'Australia',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T12:00:00Z',
    };

    mockDocClient.send.mockResolvedValueOnce({ Attributes: updatedAddress });

    const event = {
      pathParameters: { userId: 'user123', addressId: 'addr1' },
      body: JSON.stringify({
        streetAddress: '789 New St',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
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
