import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

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
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
