import * as crypto from 'crypto';
import { handler, setDocClient } from '../../src/handlers/authorize';
import * as dbClients from '../../src/db/clients';

jest.mock('../../src/db/clients');

describe('Authorize Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should authorize valid Basic Auth credentials', async () => {
    const clientSecret = 'testsecret';
    const hashedSecret = crypto.createHash('sha256').update(clientSecret).digest('hex');

    (dbClients.getClient as jest.Mock).mockResolvedValueOnce({
      clientId: 'testclient',
      clientSecret: hashedSecret,
    });

    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:ap-southeast-2:123456789012:abc123/dev/GET/users/user123/addresses',
      authorizationToken: `Basic ${Buffer.from('testclient:testsecret').toString('base64')}`,
    };

    const result = await handler(event as any);

    expect(result.principalId).toBe('testclient');
    expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    expect(result.context.clientId).toBe('testclient');
  });

  it('should reject missing authorization token', async () => {
    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:ap-southeast-2:123456789012:abc123/dev/GET/users/user123/addresses',
      authorizationToken: '',
    };

    await expect(handler(event as any, {} as any)).rejects.toThrow('Unauthorized');
  });

  it('should reject invalid token format', async () => {
    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:ap-southeast-2:123456789012:abc123/dev/GET/users/user123/addresses',
      authorizationToken: 'InvalidToken',
    };

    await expect(handler(event as any, {} as any)).rejects.toThrow('Unauthorized');
  });

  it('should reject malformed Basic Auth credentials', async () => {
    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:ap-southeast-2:123456789012:abc123/dev/GET/users/user123/addresses',
      authorizationToken: `Basic ${Buffer.from('malformed').toString('base64')}`,
    };

    await expect(handler(event as any, {} as any)).rejects.toThrow('Unauthorized');
  });

  it('should reject invalid credentials for existing client', async () => {
    const hashedSecret = crypto.createHash('sha256').update('correctsecret').digest('hex');

    (dbClients.getClient as jest.Mock).mockResolvedValueOnce({
      clientId: 'testclient',
      clientSecret: hashedSecret,
    });

    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:ap-southeast-2:123456789012:abc123/dev/GET/users/user123/addresses',
      authorizationToken: `Basic ${Buffer.from('testclient:wrongsecret').toString('base64')}`,
    };

    await expect(handler(event as any)).rejects.toThrow('Unauthorized');
  });

  it('should reject non-existent client', async () => {
    (dbClients.getClient as jest.Mock).mockResolvedValueOnce(undefined);

    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:ap-southeast-2:123456789012:abc123/dev/GET/users/user123/addresses',
      authorizationToken: `Basic ${Buffer.from('unknownclient:testsecret').toString('base64')}`,
    };

    await expect(handler(event as any, {} as any)).rejects.toThrow('Unauthorized');
  });
});


