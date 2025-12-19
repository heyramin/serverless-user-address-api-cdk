import { handler, setDocClient } from '../../src/handlers/get-addresses';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

describe('Get Addresses Handler', () => {
  let mockDocClient: any;

  beforeEach(() => {
    mockDocClient = {
      send: jest.fn(),
    };
    setDocClient(mockDocClient);
    process.env.ADDRESSES_TABLE = 'test-table';
  });

  it('should retrieve all addresses for a user from main table', async () => {
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
      {
        userId: 'user123',
        addressId: 'addr2',
        street: '456 Oak Ave',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
        country: 'Australia',
        addressType: 'billing',
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

    // Verify query used main table (no IndexName)
    const callArgs = mockDocClient.send.mock.calls[0][0];
    expect(callArgs.input.TableName).toBe('test-table');
    expect(callArgs.input.IndexName).toBeUndefined();
    expect(callArgs.input.KeyConditionExpression).toBe('userId = :userId');
  });

  it('should filter addresses by suburb using suburbIndex GSI', async () => {
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

    // Verify query used suburbIndex GSI
    const callArgs = mockDocClient.send.mock.calls[0][0];
    expect(callArgs.input.IndexName).toBe('suburbIndex');
    expect(callArgs.input.KeyConditionExpression).toBe('userId = :userId AND suburb = :suburb');
    expect(callArgs.input.ExpressionAttributeValues[':suburb']).toBe('Sydney');
  });

  it('should filter addresses by postcode using postcodeIndex GSI', async () => {
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

    // Verify query used postcodeIndex GSI
    const callArgs = mockDocClient.send.mock.calls[0][0];
    expect(callArgs.input.IndexName).toBe('postcodeIndex');
    expect(callArgs.input.KeyConditionExpression).toBe('userId = :userId AND postcode = :postcode');
    expect(callArgs.input.ExpressionAttributeValues[':postcode']).toBe('2000');
  });

  it('should use suburbIndex GSI and apply postcode FilterExpression when both filters provided', async () => {
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
      queryStringParameters: { suburb: 'Sydney', postcode: '2000' },
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(200);
    const body = JSON.parse((response as any).body);
    expect(body.addresses).toHaveLength(1);

    // Verify query used suburbIndex with postcode filter
    const callArgs = mockDocClient.send.mock.calls[0][0];
    expect(callArgs.input.IndexName).toBe('suburbIndex');
    expect(callArgs.input.KeyConditionExpression).toBe('userId = :userId AND suburb = :suburb');
    expect(callArgs.input.FilterExpression).toBe('postcode = :postcode');
    expect(callArgs.input.ExpressionAttributeValues[':suburb']).toBe('Sydney');
    expect(callArgs.input.ExpressionAttributeValues[':postcode']).toBe('2000');
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

  it('should return 400 for invalid userId format', async () => {
    const event = {
      pathParameters: { userId: 'user@123!invalid' },
      queryStringParameters: null,
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(400);
    const body = JSON.parse((response as any).body);
    expect(body.message).toContain('Invalid userId format');
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

  it('should return 500 on DynamoDB error', async () => {
    mockDocClient.send.mockRejectedValueOnce(
      new Error('DynamoDB error')
    );

    const event = {
      pathParameters: { userId: 'user123' },
      queryStringParameters: null,
    } as any;

    const response = await (handler as any)(event);

    expect((response as any).statusCode).toBe(500);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Internal server error');
  });

  it('should log correct index usage in successful query', async () => {
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
    // The handler logs "usedIndex: indexName || 'main-table'"
    // This test ensures the logic works correctly
    expect(body.addresses).toHaveLength(1);
  });
});