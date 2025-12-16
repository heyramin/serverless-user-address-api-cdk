import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import * as Joi from 'joi';
import { 
  isValidUserId, 
  isValidStreetAddress, 
  isValidSuburb, 
  isValidState,
  isValidCountry 
} from '../utils/validation';

let ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
let docClient = DynamoDBDocumentClient.from(ddbClient);

export const setDocClient = (client: any) => {
  docClient = client;
};

const schema = Joi.object({
  streetAddress: Joi.string()
    .required()
    .min(1)
    .max(256)
    .custom((value, helpers) => {
      if (!isValidStreetAddress(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'streetAddress can only contain letters, numbers, spaces, hyphens, apostrophes, periods, commas, and # symbols'
    }),
  suburb: Joi.string()
    .required()
    .min(1)
    .max(128)
    .custom((value, helpers) => {
      if (!isValidSuburb(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'suburb can only contain letters, numbers, spaces, hyphens, apostrophes, and periods'
    }),
  state: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!isValidState(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'state must be a valid Australian state code (NSW, VIC, QLD, WA, SA, TAS, ACT, NT)'
    }),
  postcode: Joi.string()
    .required()
    .pattern(/^\d{4}$/),
  country: Joi.string()
    .default('Australia')
    .custom((value, helpers) => {
      if (!isValidCountry(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'country can only contain letters, numbers, spaces, hyphens, and apostrophes'
    }),
  addressType: Joi.string()
    .valid('billing', 'mailing', 'residential', 'business')
    .optional(),
});

interface Address {
  userId: string;
  addressId: string;
  streetAddress: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  addressType?: string;
  createdAt: string;
  updatedAt: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.pathParameters?.userId;
    const body = JSON.parse(event.body || '{}');

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing userId' }),
      };
    }

    // Validate userId format (prevent SQL injection)
    if (!isValidUserId(userId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Invalid userId format. Only alphanumeric characters, hyphens (-), and underscores (_) are allowed.' 
        }),
      };
    }

    // Validate input
    const { error, value } = schema.validate(body);
    if (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Validation failed', error: error.message }),
      };
    }

    const addressId = uuidv4();
    const now = new Date().toISOString();

    const address: Address = {
      userId,
      addressId,
      ...value,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.ADDRESSES_TABLE,
        Item: address,
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Address created successfully',
        addressId,
        address,
      }),
    };
  } catch (error: any) {
    console.error('Error creating address:', error);
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
