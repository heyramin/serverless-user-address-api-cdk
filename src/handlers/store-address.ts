import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { isValidUserId } from '../utils/validation';
import { Address } from '../types/address';
import { addressCreationSchema } from '../schemas/address';
import { createLogger } from '../utils/logger';

let ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
let docClient = DynamoDBDocumentClient.from(ddbClient);

export const setDocClient = (client: any) => {
  docClient = client;
};

export const handler: APIGatewayProxyHandler = async (event, context?) => {
  const logger = createLogger(context || {});
  logger.info('Store address handler started', { userId: event.pathParameters?.userId });

  try {
    const userId = event.pathParameters?.userId;
    const body = JSON.parse(event.body || '{}');

    if (!userId) {
      logger.warn('Missing userId parameter');
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing userId' }),
      };
    }

    // Validate userId format (prevent injection)
    if (!isValidUserId(userId)) {
      logger.warn('Invalid userId format', { userIdLength: userId.length });
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Invalid userId format. Only alphanumeric characters, hyphens (-), and underscores (_) are allowed.' 
        }),
      };
    }

    // Validate input
    const { error, value } = addressCreationSchema.validate(body);
    if (error) {
      logger.warn('Validation failed', { error: error.message });
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Validation failed', error: error.message }),
      };
    }

    const addressId = uuidv4();
    const now = new Date().toISOString();
    logger.debug('Generated address ID', { addressId });

    const address: Address = {
      userId,
      addressId,
      ...value,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.ADDRESSES_TABLE,
        Item: address,
      })
    );

    logger.info('Address created successfully', { userId, addressId });
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Address created successfully',
        addressId,
        address,
      }),
    };
  } catch (error: any) {
    logger.error('Error creating address', error, { errorCode: error?.Code });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error?.message || 'Unknown error',
      }),
    };
  }
};
