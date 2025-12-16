import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';

let ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
let docClient = DynamoDBDocumentClient.from(ddbClient);

export const setDocClient = (client: any) => {
  docClient = client;
};

interface Address {
  userId: string;
  addressId: string;
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  createdAt: string;
  updatedAt: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.pathParameters?.userId;
    const suburb = event.queryStringParameters?.suburb;
    const postcode = event.queryStringParameters?.postcode;

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing userId' }),
      };
    }

    // Query addresses for user
    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.ADDRESSES_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    let addresses = result.Items as Address[];

    // Apply filters
    if (suburb) {
      addresses = addresses.filter((a) => a.suburb === suburb);
    }

    if (postcode) {
      addresses = addresses.filter((a) => a.postcode === postcode);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Addresses retrieved successfully',
        addresses,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
