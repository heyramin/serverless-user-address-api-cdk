import * as crypto from 'crypto';

export interface ApiGatewayTokenAuthorizerEvent {
  type: string;
  methodArn: string;
  authorizationToken: string;
}

export async function handler(event: ApiGatewayTokenAuthorizerEvent): Promise<any> {
  try {
    console.log('Authorizing request:', event.methodArn);

    const token = event.authorizationToken;

    if (!token || !token.startsWith('Basic ')) {
      throw new Error('Unauthorized');
    }

    const credentials = Buffer.from(token.slice(6), 'base64').toString('utf-8');
    const [clientId, clientSecret] = credentials.split(':');

    if (!clientId || !clientSecret) {
      throw new Error('Invalid credentials format');
    }

    // Hash the secret with SHA-256
    const hashedSecret = crypto.createHash('sha256').update(clientSecret).digest('hex');

    console.log('Client ID:', clientId);
    console.log('Hashed secret:', hashedSecret);

    // In a real scenario, validate against DynamoDB clients table
    // For now, we'll accept any non-empty credentials
    const principalId = clientId;

    const policy = {
      principalId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn,
          },
        ],
      },
      context: {
        clientId,
      },
    };

    console.log('Authorization successful for client:', clientId);
    return policy;
  } catch (error) {
    console.error('Authorization failed:', error);
    throw new Error('Unauthorized');
  }
}
