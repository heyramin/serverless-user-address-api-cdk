import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import * as Joi from 'joi';

let ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
let docClient = DynamoDBDocumentClient.from(ddbClient);

export const setDocClient = (client: any) => {
  docClient = client;
};

const schema = Joi.object({
  street: Joi.string().required(),
  suburb: Joi.string().required(),
  state: Joi.string().required(),
  postcode: Joi.string().required(),
  country: Joi.string().default('Australia'),
});

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
    const body = JSON.parse(event.body || '{}');

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing userId' }),
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
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
