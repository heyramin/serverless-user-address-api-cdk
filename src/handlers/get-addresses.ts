import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { isValidUserId } from '../utils/validation';
import { Address } from '../types/address';

let ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
let docClient = DynamoDBDocumentClient.from(ddbClient);

export const setDocClient = (client: any) => {
  docClient = client;
};

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

    // Validate userId format (prevent injection attacks)
    if (!isValidUserId(userId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Invalid userId format. Only alphanumeric characters, hyphens (-), and underscores (_) are allowed.' 
        }),
      };
    }

    // Build query parameters
    const queryParams: any = {
      TableName: process.env.ADDRESSES_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    };

    // Add FilterExpression for optional parameters
    const filterExpressions: string[] = [];
    if (suburb) {
      filterExpressions.push('suburb = :suburb');
      queryParams.ExpressionAttributeValues[':suburb'] = suburb;
    }
    if (postcode) {
      filterExpressions.push('postcode = :postcode');
      queryParams.ExpressionAttributeValues[':postcode'] = postcode;
    }

    if (filterExpressions.length > 0) {
      queryParams.FilterExpression = filterExpressions.join(' AND ');
    }

    // Query addresses for user
    const result = await docClient.send(
      new QueryCommand(queryParams)
    );

    const addresses = result.Items as Address[];

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Addresses retrieved successfully',
        addresses,
      }),
    };
  } catch (error: any) {
    console.error('Error retrieving addresses:', error);
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
