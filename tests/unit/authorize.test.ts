import { handler } from '../../src/handlers/authorize';

describe('Authorize Handler', () => {
  it('should authorize valid Basic Auth credentials', async () => {
    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:ap-southeast-2:123456789012:abc123/dev/GET/users/user123/addresses',
      authorizationToken: `Basic ${Buffer.from('testclient:testsecret').toString('base64')}`,
    };

    const result = await handler(event);

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

    await expect(handler(event)).rejects.toThrow('Unauthorized');
  });

  it('should reject invalid token format', async () => {
    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:ap-southeast-2:123456789012:abc123/dev/GET/users/user123/addresses',
      authorizationToken: 'InvalidToken',
    };

    await expect(handler(event)).rejects.toThrow('Unauthorized');
  });

  it('should reject malformed Basic Auth credentials', async () => {
    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:ap-southeast-2:123456789012:abc123/dev/GET/users/user123/addresses',
      authorizationToken: `Basic ${Buffer.from('malformed').toString('base64')}`,
    };

    await expect(handler(event)).rejects.toThrow('Unauthorized');
  });
});
