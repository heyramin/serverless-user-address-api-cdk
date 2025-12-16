import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';

let ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
let docClient = DynamoDBDocumentClient.from(ddbClient);

export const setDocClient = (client: any) => {
  docClient = client;
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.pathParameters?.userId;
    const addressId = event.pathParameters?.addressId;

    if (!userId || !addressId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing userId or addressId' }),
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
    console.error('Error deleting address:', error);
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
