import * as crypto from 'crypto';
import { createLogger } from '../utils/logger';
import { setDocClient, getClient } from '../db';

export { setDocClient };

export interface ApiGatewayTokenAuthorizerEvent {
  type: string;
  methodArn: string;
  authorizationToken: string;
}

export async function handler(event: ApiGatewayTokenAuthorizerEvent, context?: any): Promise<any> {
  const logger = createLogger(context || {});
  logger.info('Authorization handler started', { methodArn: event.methodArn });
  
  try {
    const token = event.authorizationToken;
    logger.debug('Token validation started', { tokenPresent: !!token });

    if (!token || !token.startsWith('Basic ')) {
      logger.warn('Invalid authorization header');
      throw new Error('Unauthorized');
    }

    const credentials = Buffer.from(token.slice(6), 'base64').toString('utf-8');
    const [clientId, clientSecret] = credentials.split(':');

    if (!clientId || !clientSecret) {
      logger.warn('Invalid credentials format');
      throw new Error('Unauthorized');
    }

    // Hash the secret with SHA-256
    const hashedSecret = crypto.createHash('sha256').update(clientSecret).digest('hex');

    logger.debug('Credentials extracted', { clientId, hashedSecretLength: hashedSecret.length });

    // Validate against DynamoDB clients table
    logger.debug('Querying clients table');
    
    const client = await getClient(clientId);
    if (!client || client.clientSecret !== hashedSecret) {
      logger.warn('Invalid credentials for client', { clientId, secretMatch: false });
      throw new Error('Unauthorized');
    }

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

    logger.info('Authorization successful', { clientId });
    return policy;
  } catch (error: any) {
    logger.error('Authorization failed', error, { errorType: error?.constructor?.name });
    throw error;
  }
}
