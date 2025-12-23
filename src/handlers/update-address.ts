import { APIGatewayProxyHandler } from 'aws-lambda';
import { isValidUserId, isValidAddressId } from '../utils/validation';
import { addressUpdateSchema } from '../schemas/address';
import { createLogger } from '../utils/logger';
import { setDocClient, updateAddress } from '../db';

export { setDocClient };

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
    const updates: Record<string, any> = {};
    const names: Record<string, string> = {};
    const expressions: string[] = [];

    if (value.streetAddress) {
      updates[':streetAddress'] = value.streetAddress;
      names['#streetAddress'] = 'streetAddress';
      expressions.push('#streetAddress = :streetAddress');
    }
    if (value.suburb) {
      updates[':suburb'] = value.suburb;
      names['#suburb'] = 'suburb';
      expressions.push('#suburb = :suburb');
    }
    if (value.addressType) {
      updates[':addressType'] = value.addressType;
      names['#addressType'] = 'addressType';
      expressions.push('#addressType = :addressType');
    }
    if (value.state) {
      updates[':state'] = value.state;
      names['#state'] = 'state';
      expressions.push('#state = :state');
    }
    if (value.postcode) {
      updates[':postcode'] = value.postcode;
      names['#postcode'] = 'postcode';
      expressions.push('#postcode = :postcode');
    }
    if (value.country) {
      updates[':country'] = value.country;
      names['#country'] = 'country';
      expressions.push('#country = :country');
    }

    if (expressions.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: '"value" must have at least 1 key' }),
      };
    }

    updates[':updatedAt'] = new Date().toISOString();
    names['#updatedAt'] = 'updatedAt';
    expressions.push('#updatedAt = :updatedAt');

    const updatedAddress = await updateAddress(userId, addressId, updates, names, expressions.join(', '));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Address updated successfully',
        address: updatedAddress,
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
