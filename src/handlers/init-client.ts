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

import * as AWS from 'aws-sdk';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';

// Allow dependency injection for testing
let dynamodb = new AWS.DynamoDB.DocumentClient();

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

export const handler = async (event: ClientRequest, context?: any): Promise<any> => {
  const logger = createLogger(context || {});
  logger.info('Initialize client handler started', { clientName: event.clientName });

  try {
    const clientTableName = process.env.CLIENT_TABLE_NAME!;

    if (!event.clientName) {
      logger.warn('Missing clientName in request');
      throw new Error('clientName is required');
    }

    const body = event;

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
      // Client credentials expire after 2 day
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await dynamodb
      .put({
        TableName: clientTableName,
        Item: clientRecord,
      })
      .promise();

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

    logger.info('Client created successfully', { clientId, clientName: body.clientName });
    return response;
  } catch (error) {
    logger.error('Error creating client', error as Error);
    throw error;
  }
};
