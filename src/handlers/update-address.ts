import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { isValidUserId, isValidAddressId } from '../utils/validation';
import { addressUpdateSchema } from '../schemas/address';
import { createLogger } from '../utils/logger';

let ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
let docClient = DynamoDBDocumentClient.from(ddbClient);

export const setDocClient = (client: any) => {
  docClient = client;
};

export const handler: APIGatewayProxyHandler = async (event, context?) => {
  const logger = createLogger(context || {});
  logger.info('Update address handler started', { userId: event.pathParameters?.userId });

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

    // Validate request body against update schema
    const { error, value } = addressUpdateSchema.validate(body);
    if (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: error.details[0].message 
        }),
      };
    }

    // Build update expression dynamically
    const updates: string[] = [];
    const values: Record<string, any> = {};
    const names: Record<string, string> = {};

    if (value.streetAddress) {
      updates.push('#streetAddress = :streetAddress');
      names['#streetAddress'] = 'streetAddress';
      values[':streetAddress'] = value.streetAddress;
    }
    if (value.suburb) {
      updates.push('#suburb = :suburb');
      names['#suburb'] = 'suburb';
      values[':suburb'] = value.suburb;
    }
    if (value.addressType) {
      updates.push('#addressType = :addressType');
      names['#addressType'] = 'addressType';
      values[':addressType'] = value.addressType;
    }
    if (value.state) {
      updates.push('#state = :state');
      names['#state'] = 'state';
      values[':state'] = value.state;
    }
    if (value.postcode) {
      updates.push('#postcode = :postcode');
      names['#postcode'] = 'postcode';
      values[':postcode'] = value.postcode;
    }
    if (value.country) {
      updates.push('#country = :country');
      names['#country'] = 'country';
      values[':country'] = value.country;
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: '"value" must have at least 1 key' }),
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
    logger.error('Error updating address', error, { errorCode: error?.Code });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error?.message || 'Unknown error',
      }),
    };
  }
};
