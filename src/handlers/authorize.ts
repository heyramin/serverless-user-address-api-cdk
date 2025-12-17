import * as crypto from 'crypto';
import * as AWS from 'aws-sdk';
import { createLogger } from '../utils/logger';

// Initialize DynamoDB client outside handler for connection reuse (avoid cold start)
let dynamodb = new AWS.DynamoDB.DocumentClient();

export function setDynamoDBClient(client: AWS.DynamoDB.DocumentClient) {
  dynamodb = client;
}

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
    const clientTableName = process.env.CLIENTS_TABLE || 'user-address-clients-dev';
    logger.debug('Querying clients table', { tableName: clientTableName });
    
    const result = await dynamodb
      .get({
        TableName: clientTableName,
        Key: { clientId },
      })
      .promise();

    logger.debug('DynamoDB query completed', { clientFound: !!result.Item });

    if (!result.Item) {
      logger.warn('Client not found in database', { clientId });
      throw new Error('Unauthorized');
    }

    // Verify the hashed secret matches
    if (result.Item.clientSecret !== hashedSecret) {
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
