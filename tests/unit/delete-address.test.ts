import { handler } from '../../src/handlers/delete-address';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

jest.mock('@aws-sdk/lib-dynamodb');

describe('Delete Address Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete an address successfully', async () => {
    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue({
      send: jest.fn().mockResolvedValue({}),
    });

    const event = {
      pathParameters: { userId: 'user123', addressId: 'addr1' },
      body: null,
    } as any;

    const context = {} as any;
    const response = await handler(event, context);

    expect((response as any).statusCode).toBe(204);
    expect((response as any).body).toBe('');
  });

  it('should return 400 for missing userId', async () => {
    const event = {
      pathParameters: { addressId: 'addr1' },
      body: null,
    } as any;

    const context = {} as any;
    const response = await handler(event, context);

    expect((response as any).statusCode).toBe(400);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Missing userId or addressId');
  });

  it('should return 400 for missing addressId', async () => {
    const event = {
      pathParameters: { userId: 'user123' },
      body: null,
    } as any;

    const context = {} as any;
    const response = await handler(event, context);

    expect((response as any).statusCode).toBe(400);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Missing userId or addressId');
  });

  it('should return 400 when both userId and addressId are missing', async () => {
    const event = {
      pathParameters: {},
      body: null,
    } as any;

    const context = {} as any;
    const response = await handler(event, context);

    expect((response as any).statusCode).toBe(400);
    const body = JSON.parse((response as any).body);
    expect(body.message).toBe('Missing userId or addressId');
  });
});
