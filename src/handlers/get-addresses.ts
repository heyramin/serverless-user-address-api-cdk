import { APIGatewayProxyHandler } from 'aws-lambda';
import { isValidUserId, isValidSuburb, isValidPostcode } from '../utils/validation';
import { Address } from '../types/address';
import { createLogger } from '../utils/logger';
import { setDocClient, queryAddresses } from '../db';

export { setDocClient };

export const handler: APIGatewayProxyHandler = async (event, context?) => {
  const logger = createLogger(context || {});
  logger.info('Get addresses handler started', { userId: event.pathParameters?.userId });

  try {
    const userId = event.pathParameters?.userId;
    const suburb = event.queryStringParameters?.suburb;
    const postcode = event.queryStringParameters?.postcode;

    if (!userId) {
      logger.warn('Missing userId parameter');
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing userId' }),
      };
    }

    // Validate userId format (prevent injection attacks)
    if (!isValidUserId(userId)) {
      logger.warn('Invalid userId format', { userIdLength: userId.length });
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Invalid userId format. Only alphanumeric characters, hyphens (-), and underscores (_) are allowed.' 
        }),
      };
    }

    // Validate suburb if provided
    if (suburb && !isValidSuburb(suburb)) {
      logger.warn('Invalid suburb format', { suburb });
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Invalid suburb format. Only alphanumeric characters, spaces, hyphens, apostrophes, and periods are allowed.' 
        }),
      };
    }

    // Validate postcode if provided
    if (postcode && !isValidPostcode(postcode)) {
      logger.warn('Invalid postcode format', { postcode });
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Invalid postcode format. Postcode must be exactly 4 digits.' 
        }),
      };
    }

    // Query addresses for user
    const addresses = await queryAddresses(userId, suburb, postcode);

    logger.info('Addresses retrieved successfully', { count: addresses.length });
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Addresses retrieved successfully',
        addresses,
      }),
    };
  } catch (error: any) {
    logger.error('Error retrieving addresses', error, { errorCode: error?.Code });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error?.message || 'Unknown error',
      }),
    };
  }
};
