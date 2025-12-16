import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { isValidUserId } from '../utils/validation';
import { Address } from '../types/address';
import { addressCreationSchema } from '../schemas/address';

let ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
let docClient = DynamoDBDocumentClient.from(ddbClient);

export const setDocClient = (client: any) => {
  docClient = client;
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.pathParameters?.userId;
    const body = JSON.parse(event.body || '{}');

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing userId' }),
      };
    }

    // Validate userId format (prevent SQL injection)
    if (!isValidUserId(userId)) {
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
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Validation failed', error: error.message }),
      };
    }

    const addressId = uuidv4();
    const now = new Date().toISOString();

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

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Address created successfully',
        addressId,
        address,
      }),
    };
  } catch (error: any) {
    console.error('Error creating address:', error);
    console.error('Error message:', error?.message);
    console.error('Error code:', error?.Code);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error?.message || 'Unknown error',
      }),
    };
  }
};
