import { APIGatewayProxyHandler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { isValidUserId } from '../utils/validation';
import { Address } from '../types/address';
import { addressCreationSchema } from '../schemas/address';
import { createLogger } from '../utils/logger';
import { setDocClient, queryAddresses, storeAddress } from '../db';

export { setDocClient };

export const handler: APIGatewayProxyHandler = async (event, context?) => {
  const logger = createLogger(context || {});
  logger.info('Store address handler started', { userId: event.pathParameters?.userId });

  try {
    const userId = event.pathParameters?.userId;
    const body = JSON.parse(event.body || '{}');

    if (!userId) {
      logger.warn('Missing userId parameter');
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing userId' }),
      };
    }

    // Validate userId format (prevent injection)
    if (!isValidUserId(userId)) {
      logger.warn('Invalid userId format', { userIdLength: userId.length });
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
      logger.warn('Validation failed', { error: error.message });
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Validation failed', error: error.message }),
      };
    }

    const addressId = uuidv4();
    const now = new Date().toISOString();
    logger.debug('Generated address ID', { addressId });

    // Check for duplicate address
    const existingAddresses = await queryAddresses(userId);
    const isDuplicate = existingAddresses.some(
      (existing) =>
        existing.streetAddress.toLowerCase() === value.streetAddress.toLowerCase() &&
        existing.suburb.toLowerCase() === value.suburb.toLowerCase() &&
        existing.state === value.state &&
        existing.postcode === value.postcode &&
        existing.country.toLowerCase() === value.country.toLowerCase() &&
        existing.addressType === (value.addressType || null)
    );

    if (isDuplicate) {
      logger.warn('Duplicate address attempt', { userId, address: value });
      return {
        statusCode: 409,
        body: JSON.stringify({ 
          message: 'An identical address already exists for this user',
          error: 'DUPLICATE_ADDRESS'
        }),
      };
    }

    const address: Address = {
      userId,
      addressId,
      ...value,
      createdAt: now,
      updatedAt: now,
    };

    await storeAddress(address);

    logger.info('Address created successfully', { userId, addressId });
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Address created successfully',
        addressId,
        address,
      }),
    };
  } catch (error: any) {
    logger.error('Error creating address', error, { errorCode: error?.Code });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error?.message || 'Unknown error',
      }),
    };
  }
};
