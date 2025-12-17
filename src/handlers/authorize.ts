import * as crypto from 'crypto';
import * as AWS from 'aws-sdk';

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

export async function handler(event: ApiGatewayTokenAuthorizerEvent): Promise<any> {
  console.log('=== AUTHORIZE HANDLER START ===');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    console.log('Authorizing request:', event.methodArn);

    const token = event.authorizationToken;
    console.log('Token present:', !!token);

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
    console.log('Querying table:', clientTableName);
    
    const result = await dynamodb
      .get({
        TableName: clientTableName,
        Key: { clientId },
      })
      .promise();

    console.log('DynamoDB result:', JSON.stringify(result, null, 2));

    if (!result.Item) {
      console.warn('Client not found:', clientId);
      throw new Error('Unauthorized');
    }

    // Verify the hashed secret matches
    if (result.Item.clientSecret !== hashedSecret) {
      console.warn('Invalid credentials for client:', clientId);
      console.warn('Expected:', result.Item.clientSecret);
      console.warn('Got:', hashedSecret);
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
    console.log('=== AUTHORIZE HANDLER END (SUCCESS) ===');
    return policy;
  } catch (error: any) {
    console.error('=== AUTHORIZE HANDLER ERROR ===');
    console.error('Authorization failed:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('=== AUTHORIZE HANDLER END (FAILURE) ===');
    throw error;
  }
}
