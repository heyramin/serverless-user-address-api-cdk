import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { isValidUserId, isValidAddressId } from '../utils/validation';
import { createLogger } from '../utils/logger';

let ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
let docClient = DynamoDBDocumentClient.from(ddbClient);

export const setDocClient = (client: any) => {
  docClient = client;
};

export const handler: APIGatewayProxyHandler = async (event, context?) => {
  const logger = createLogger(context || {});
  logger.info('Delete address handler started', { userId: event.pathParameters?.userId });

  try {
    const userId = event.pathParameters?.userId;
    const addressId = event.pathParameters?.addressId;

    if (!userId || !addressId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing userId or addressId' }),
      };
    }

    // Validate userId and addressId format (prevent injection attacks)
    if (!isValidUserId(userId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Invalid userId format. Only alphanumeric characters, hyphens (-), and underscores (_) are allowed.' 
        }),
      };
    }

    if (!isValidAddressId(addressId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Invalid addressId format. Must be a valid UUID.' 
        }),
      };
    }

    await docClient.send(
      new DeleteCommand({
        TableName: process.env.ADDRESSES_TABLE,
        Key: {
          userId,
          addressId,
        },
      })
    );

    return {
      statusCode: 204,
      body: '',
    };
  } catch (error: any) {
    logger.error('Error deleting address', error, { errorCode: error?.Code });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error?.message || 'Unknown error',
      }),
    };
  }
};
