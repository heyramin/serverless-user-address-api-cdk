import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { isValidUserId, isValidAddressId } from '../utils/validation';
import { Address } from '../types/address';

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

    // Build update expression dynamically
    const updates: string[] = [];
    const values: Record<string, any> = {};
    const names: Record<string, string> = {};

    if (body.streetAddress) {
      updates.push('#streetAddress = :streetAddress');
      names['#streetAddress'] = 'streetAddress';
      values[':streetAddress'] = body.streetAddress;
    }
    if (body.suburb) {
      updates.push('#suburb = :suburb');
      names['#suburb'] = 'suburb';
      values[':suburb'] = body.suburb;
    }
    if (body.addressType) {
      if (!['billing', 'mailing', 'residential', 'business'].includes(body.addressType)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Invalid addressType. Must be one of: billing, mailing, residential, business' }),
        };
      }
      updates.push('#addressType = :addressType');
      names['#addressType'] = 'addressType';
      values[':addressType'] = body.addressType;
    }
    if (body.state) {
      updates.push('#state = :state');
      names['#state'] = 'state';
      values[':state'] = body.state;
    }
    if (body.postcode) {
      updates.push('#postcode = :postcode');
      names['#postcode'] = 'postcode';
      values[':postcode'] = body.postcode;
    }
    if (body.country) {
      updates.push('#country = :country');
      names['#country'] = 'country';
      values[':country'] = body.country;
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'No fields to update' }),
      };
    }

    updates.push('#updatedAt = :updatedAt');
    names['#updatedAt'] = 'updatedAt';
    values[':updatedAt'] = new Date().toISOString();

    const result = await docClient.send(
      new UpdateCommand({
        TableName: process.env.ADDRESSES_TABLE,
        Key: {
          userId,
          addressId,
        },
        UpdateExpression: `SET ${updates.join(', ')}`,
        ExpressionAttributeNames: names,
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
  } catch (error: any) {
    console.error('Error updating address:', error);
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
