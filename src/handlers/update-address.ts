import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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
    const body = JSON.parse(event.body || '{}');

    if (!userId || !addressId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing userId or addressId' }),
      };
    }

    // Build update expression dynamically
    const updates: string[] = [];
    const values: Record<string, any> = {};

    if (body.streetAddress) {
      updates.push('streetAddress = :streetAddress');
      values[':streetAddress'] = body.streetAddress;
    }
    if (body.suburb) {
      updates.push('suburb = :suburb');
      values[':suburb'] = body.suburb;
    }
    if (body.state) {
      updates.push('state = :state');
      values[':state'] = body.state;
    }
    if (body.postcode) {
      updates.push('postcode = :postcode');
      values[':postcode'] = body.postcode;
    }
    if (body.country) {
      updates.push('country = :country');
      values[':country'] = body.country;
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'No fields to update' }),
      };
    }

    updates.push('updatedAt = :updatedAt');
    values[':updatedAt'] = new Date().toISOString();

    const result = await docClient.send(
      new UpdateCommand({
        TableName: process.env.ADDRESSES_TABLE,
        Key: {
          userId,
          addressId,
        },
        UpdateExpression: `SET ${updates.join(', ')}`,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Address updated successfully',
        address: result.Attributes,
        addressId,
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
