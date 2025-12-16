import * as crypto from 'crypto';
import * as AWS from 'aws-sdk';

let dynamodb: AWS.DynamoDB.DocumentClient;

function getDynamoDBClient() {
  if (!dynamodb) {
    dynamodb = new AWS.DynamoDB.DocumentClient();
  }
  return dynamodb;
}

export function setDynamoDBClient(client: AWS.DynamoDB.DocumentClient) {
  dynamodb = client;
}

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
      console.warn('Missing or invalid Authorization header');
      throw new Error('Unauthorized');
    }

    const credentials = Buffer.from(token.slice(6), 'base64').toString('utf-8');
    const [clientId, clientSecret] = credentials.split(':');

    if (!clientId || !clientSecret) {
      console.warn('Invalid credentials format');
      throw new Error('Unauthorized');
    }

    // Hash the secret with SHA-256
    const hashedSecret = crypto.createHash('sha256').update(clientSecret).digest('hex');

    console.log('Client ID:', clientId);
    console.log('Hashed secret:', hashedSecret);

    // Validate against DynamoDB clients table
    const clientTableName = process.env.CLIENTS_TABLE || 'user-address-clients-dev';
    const result = await getDynamoDBClient()
      .get({
        TableName: clientTableName,
        Key: { clientId },
      })
      .promise();

    if (!result.Item) {
      console.warn('Client not found:', clientId);
      throw new Error('Unauthorized');
    }

    // Verify the hashed secret matches
    if (result.Item.clientSecret !== hashedSecret) {
      console.warn('Invalid credentials for client:', clientId);
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

    console.log('Authorization successful for client:', clientId);
    return policy;
  } catch (error) {
    console.error('Authorization failed:', error);
    throw new Error('Unauthorized');
  }
}
