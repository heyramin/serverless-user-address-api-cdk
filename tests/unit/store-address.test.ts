import { handler } from '../../src/handlers/store-address';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as Joi from 'joi';

jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

describe('Store Address Handler', () => {
  let mockDocClient: jest.Mocked<DynamoDBDocumentClient>;

  beforeEach(() => {
    mockDocClient = DynamoDBDocumentClient.from as jest.MockedFunction<
      typeof DynamoDBDocumentClient.from
    >;
    jest.clearAllMocks();
  });

  it('should store a valid address', async () => {
    const mockSend = jest.fn().mockResolvedValue({});
    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue({
      send: mockSend,
    });

    const event = {
      pathParameters: { userId: 'user123' },
      body: JSON.stringify({
        streetAddress: '123 Main St',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      }),
    } as any;

    const response = await handler(event);

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Address created successfully');
    expect(body.addressId).toBe('test-uuid-1234');
    expect(body.address.userId).toBe('user123');
    expect(body.address.suburb).toBe('Sydney');
  });

  it('should return 400 for missing required fields', async () => {
    const event = {
      pathParameters: { userId: 'user123' },
      body: JSON.stringify({
        streetAddress: '123 Main St',
        // Missing required fields
      }),
    } as any;

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
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

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Missing userId');
  });

  it('should default country to Australia', async () => {
    const mockSend = jest.fn().mockResolvedValue({});
    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue({
      send: mockSend,
    });

    const event = {
      pathParameters: { userId: 'user123' },
      body: JSON.stringify({
        streetAddress: '123 Main St',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      }),
    } as any;

    const response = await handler(event);

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.address.country).toBe('Australia');
  });
});
