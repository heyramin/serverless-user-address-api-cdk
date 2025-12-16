/**
 * Initialize Client Handler
 * Admin utility to create client credentials (clientId + clientSecret pairs)
 * These credentials are used for API authentication via Authorization: Basic header
 *
 * INVOCATION: Use AWS Lambda directly (via AWS CLI or SDK)
 * Not exposed as HTTP endpoint - only accessible to IAM-authenticated users
 *
 * Example:
 * aws lambda invoke \
 *   --function-name UserAddressApiStack-dev-InitClientFunction-xxxxx \
 *   --payload '{"clientName":"My App"}' \
 *   response.json
 *
 * IMPROVEMENT: Add credential rotation policies
 * IMPROVEMENT: Add audit logging for client creation
 * IMPROVEMENT: Implement client credential expiration
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const dynamodbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
let dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

export const setDynamoDBClient = (client: any) => {
  dynamodb = client;
};

interface ClientRequest {
  clientName: string;
  description?: string;
}

/**
 * Hash clientSecret using SHA-256
 * Store hashed version in DB, never store plain text
 */
function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

/**
 * Generate a random secret (32 characters)
 */
function generateSecret(): string {
  return crypto.randomBytes(24).toString('hex');
}

export const handler = async (event: ClientRequest | APIGatewayProxyEvent): Promise<any> => {
  try {
    const clientTableName = process.env.CLIENT_TABLE_NAME!;

    // Check if this is direct Lambda invocation (ClientRequest) or API Gateway (APIGatewayProxyEvent)
    const body =
      'clientName' in event ? event : JSON.parse((event as APIGatewayProxyEvent).body || '{}');

    if (!body.clientName) {
      const error = {
        statusCode: 400,
        body: JSON.stringify({ message: 'clientName is required' }),
      };
      return 'statusCode' in event ? error : { error: 'clientName is required' };
    }

    // Generate new credentials
    const clientId = `cli_${uuidv4()}`;
    const clientSecret = generateSecret();
    const hashedSecret = hashSecret(clientSecret);

    const clientRecord = {
      clientId,
      clientSecret: hashedSecret, // Store hashed version
      clientName: body.clientName,
      description: body.description || '',
      active: true,
      createdAt: new Date().toISOString(),
      // Client credentials expire after 1 year
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await dynamodb.send(
      new PutCommand({
        TableName: clientTableName,
        Item: clientRecord,
      })
    );

    // Return clientId and plain text secret (only shown once!)
    const response = {
      message: 'Client created successfully',
      clientId,
      clientSecret, // Plain text secret (shown only once)
      clientName: body.clientName,
      createdAt: clientRecord.createdAt,
      warning: 'Save the clientSecret now - it cannot be retrieved later',
      usage: `Authorization: Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString(
        'base64'
      )}`,
    };

    console.log(`✅ Client created: ${clientId}`);
    return response;
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
};
