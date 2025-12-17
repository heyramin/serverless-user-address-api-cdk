import { Given, When, Then, Before, After, DataTable } from '@cucumber/cucumber';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

// World type for storing test context
interface AddressWorld {
  apiClient: AWS.DynamoDB.DocumentClient;
  currentResponse: any;
  lastAddressId: string;
  userId: string;
  addressData: any;
  addresses: any[];
  error: any;
  addressTableName: string;
  clientTableName: string;
}

// Extend the World with our custom properties
const world: AddressWorld = {
  apiClient: null as any,
  currentResponse: null,
  lastAddressId: '',
  userId: '',
  addressData: {},
  addresses: [],
  error: null,
  addressTableName: process.env.ADDRESSES_TABLE_NAME || 'user-addresses-dev',
  clientTableName: process.env.CLIENT_TABLE_NAME || 'user-address-clients-dev',
};

// Helper function to hash and encode credentials
function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

// Before hook - Initialize
Before(function () {
  const dynamodbConfig = {
    region: process.env.AWS_REGION || 'ap-southeast-2',
  };

  if (process.env.DYNAMODB_ENDPOINT) {
    (dynamodbConfig as any).endpoint = process.env.DYNAMODB_ENDPOINT;
  }

  world.apiClient = new AWS.DynamoDB.DocumentClient(dynamodbConfig);
  world.currentResponse = null;
  world.lastAddressId = '';
  world.userId = '';
  world.addressData = {};
  world.addresses = [];
  world.error = null;
});

// After hook - Cleanup
After(async function () {
  // Cleanup stored addresses
  if (world.addresses && world.addresses.length > 0) {
    for (const address of world.addresses) {
      try {
        await world.apiClient
          .delete({
            TableName: world.addressTableName,
            Key: {
              userId: address.userId,
              addressId: address.addressId,
            },
          })
          .promise();
      } catch (error) {
        console.log(`Cleanup error: ${error}`);
      }
    }
  }
});

// Background steps
Given('the API is initialized', async function () {
  // API is initialized in Before hook
  if (!world.apiClient) {
    throw new Error('API client not initialized');
  }
});

Given('I am authenticated with valid credentials', async function () {
  // In a real scenario, this would set up authentication
  // For now, we're using DynamoDB directly which simulates authenticated access
  world.userId = `test_user_${uuidv4().substring(0, 8)}`;
});

// Store address steps
When('I store a new address with the following details:', async function (dataTable: DataTable) {
  const rows = dataTable.rowsHash();

  world.addressData = {
    addressId: uuidv4(),
    userId: rows['userId'] || world.userId,
    streetAddress: rows['streetAddress'],
    suburb: rows['suburb'],
    state: rows['state'],
    postcode: rows['postcode'],
    country: rows['country'],
    createdAt: new Date().toISOString(),
  };

  try {
    world.currentResponse = await world.apiClient
      .put({
        TableName: world.addressTableName,
        Item: world.addressData,
      })
      .promise();

    world.lastAddressId = world.addressData.addressId;
    world.addresses.push(world.addressData);
  } catch (error) {
    world.error = error;
  }
});

Then('the address should be created successfully', function () {
  if (world.error) {
    throw new Error(`Failed to create address: ${world.error.message}`);
  }
  if (!world.currentResponse) {
    throw new Error('No response from address creation');
  }
});

Then('the response should contain an addressId', function () {
  if (!world.lastAddressId) {
    throw new Error('Address ID not found in response');
  }
});

// Retrieve addresses by postcode steps
Given('I have stored addresses with the following postcodes:', async function (dataTable: DataTable) {
  const rows = dataTable.rows();
  const userId = world.userId || `test_user_${uuidv4().substring(0, 8)}`;

  for (const row of rows) {
    const address = {
      addressId: uuidv4(),
      userId: userId,
      streetAddress: `${Math.random() * 1000} Test Street`,
      suburb: 'Test Suburb',
      state: 'NSW',
      postcode: row[0],
      country: 'Australia',
      createdAt: new Date().toISOString(),
    };

    try {
      await world.apiClient
        .put({
          TableName: world.addressTableName,
          Item: address,
        })
        .promise();

      world.addresses.push(address);
    } catch (error) {
      throw new Error(`Failed to store address: ${(error as any).message}`);
    }
  }
});

When('I retrieve addresses with postcode {string}', async function (postcode: string) {
  try {
    const response = await world.apiClient
      .query({
        TableName: world.addressTableName,
        IndexName: 'userIdPostcodeIndex',
        KeyConditionExpression: 'userId = :userId',
        FilterExpression: 'postcode = :postcode',
        ExpressionAttributeValues: {
          ':userId': world.userId,
          ':postcode': postcode,
        },
      })
      .promise();

    world.currentResponse = response;
  } catch (error) {
    world.error = error;
  }
});

Then('I should get {int} address', function (count: number) {
  if (!world.currentResponse || !world.currentResponse.Items) {
    throw new Error('No response received');
  }
  if (world.currentResponse.Items.length !== count) {
    throw new Error(
      `Expected ${count} address(es), got ${world.currentResponse.Items.length}`
    );
  }
});

Then('the address should have postcode {string}', function (postcode: string) {
  if (!world.currentResponse.Items || world.currentResponse.Items.length === 0) {
    throw new Error('No addresses found');
  }
  const address = world.currentResponse.Items[0];
  if (address.postcode !== postcode) {
    throw new Error(`Expected postcode ${postcode}, got ${address.postcode}`);
  }
});

// Filter by multiple postcodes
Given('I have stored addresses with the following details:', async function (dataTable: DataTable) {
  const rows = dataTable.hashes();

  for (const row of rows) {
    const address = {
      addressId: uuidv4(),
      userId: row['userId'],
      streetAddress: `${Math.random() * 1000} Test Street`,
      suburb: 'Test Suburb',
      state: 'NSW',
      postcode: row['postcode'],
      country: 'Australia',
      createdAt: new Date().toISOString(),
    };

    try {
      await world.apiClient
        .put({
          TableName: world.addressTableName,
          Item: address,
        })
        .promise();

      world.addresses.push(address);
    } catch (error) {
      throw new Error(`Failed to store address: ${(error as any).message}`);
    }
  }
});

When(
  'I retrieve addresses for user {string} with postcode {string}',
  async function (userId: string, postcode: string) {
    try {
      const response = await world.apiClient
        .query({
          TableName: world.addressTableName,
          KeyConditionExpression: 'userId = :userId',
          FilterExpression: 'postcode = :postcode',
          ExpressionAttributeValues: {
            ':userId': userId,
            ':postcode': postcode,
          },
        })
        .promise();

      world.currentResponse = response;
    } catch (error) {
      world.error = error;
    }
  }
);

Then('the address postcode should be {string}', function (postcode: string) {
  if (!world.currentResponse.Items || world.currentResponse.Items.length === 0) {
    throw new Error('No addresses found');
  }
  const address = world.currentResponse.Items[0];
  if (address.postcode !== postcode) {
    throw new Error(`Expected postcode ${postcode}, got ${address.postcode}`);
  }
});

// Update address steps
When('I update the address with the following changes:', async function (dataTable: DataTable) {
  const updates = dataTable.rowsHash();

  const updateExpression = Object.keys(updates)
    .map((key, index) => `${key} = :val${index}`)
    .join(', ');

  const expressionAttributeValues: any = {};
  Object.values(updates).forEach((value, index) => {
    expressionAttributeValues[`:val${index}`] = value;
  });

  try {
    world.currentResponse = await world.apiClient
      .update({
        TableName: world.addressTableName,
        Key: {
          userId: world.addressData.userId,
          addressId: world.lastAddressId,
        },
        UpdateExpression: `SET ${updateExpression}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
      .promise();

    // Update cached data
    Object.assign(world.addressData, updates);
  } catch (error) {
    world.error = error;
  }
});

Then('the address should be updated successfully', function () {
  if (world.error) {
    throw new Error(`Failed to update address: ${world.error.message}`);
  }
  if (!world.currentResponse) {
    throw new Error('No response from address update');
  }
});

Then(
  'the updated address should contain:',
  function (dataTable: DataTable) {
    const expected = dataTable.rowsHash();

    if (!world.currentResponse.Attributes) {
      throw new Error('No attributes in update response');
    }

    for (const [key, value] of Object.entries(expected)) {
      if (world.currentResponse.Attributes[key] !== value) {
        throw new Error(
          `Expected ${key} to be ${value}, got ${world.currentResponse.Attributes[key]}`
        );
      }
    }
  }
);

// Delete address steps
When('I delete the address', async function () {
  try {
    world.currentResponse = await world.apiClient
      .delete({
        TableName: world.addressTableName,
        Key: {
          userId: world.addressData.userId,
          addressId: world.lastAddressId,
        },
      })
      .promise();

    // Remove from tracking
    world.addresses = world.addresses.filter(
      (a) => a.addressId !== world.lastAddressId
    );
  } catch (error) {
    world.error = error;
  }
});

Then('the address should be deleted successfully', function () {
  if (world.error) {
    throw new Error(`Failed to delete address: ${world.error.message}`);
  }
  if (!world.currentResponse) {
    throw new Error('No response from address deletion');
  }
});

Then('attempting to retrieve the address should return no results', async function () {
  try {
    const response = await world.apiClient
      .get({
        TableName: world.addressTableName,
        Key: {
          userId: world.addressData.userId,
          addressId: world.lastAddressId,
        },
      })
      .promise();

    if (response.Item) {
      throw new Error('Address still exists after deletion');
    }
  } catch (error) {
    if ((error as any).code === 'ResourceNotFoundException') {
      // Expected
      return;
    }
    throw error;
  }
});

// Validation steps
When('I attempt to store an address without a suburb', async function () {
  world.addressData = {
    addressId: uuidv4(),
    userId: world.userId || `test_user_${uuidv4().substring(0, 8)}`,
    streetAddress: '123 Test Street',
    // Missing suburb
    state: 'NSW',
    postcode: '2000',
    country: 'Australia',
    createdAt: new Date().toISOString(),
  };

  try {
    world.currentResponse = await world.apiClient
      .put({
        TableName: world.addressTableName,
        Item: world.addressData,
      })
      .promise();
  } catch (error) {
    world.error = error;
  }
});

Then('the request should fail with validation error', function () {
  if (!world.error) {
    throw new Error('Expected validation error but request succeeded');
  }
});

Then('the error message should mention {string}', function (keyword: string) {
  if (!world.error || !world.error.message) {
    throw new Error('No error message available');
  }
  if (!world.error.message.includes(keyword)) {
    throw new Error(
      `Error message does not contain "${keyword}". Message: ${world.error.message}`
    );
  }
});

// Retrieve all addresses steps
Given(
  'I have stored multiple addresses for user {string}:',
  async function (userId: string, dataTable: DataTable) {
    const rows = dataTable.hashes();

    for (const row of rows) {
      const address = {
        addressId: uuidv4(),
        userId: userId,
        streetAddress: row['streetAddress'],
        suburb: row['suburb'],
        state: 'NSW',
        postcode: row['postcode'],
        country: 'Australia',
        createdAt: new Date().toISOString(),
      };

      try {
        await world.apiClient
          .put({
            TableName: world.addressTableName,
            Item: address,
          })
          .promise();

        world.addresses.push(address);
      } catch (error) {
        throw new Error(`Failed to store address: ${(error as any).message}`);
      }
    }
  }
);

When('I retrieve all addresses for user {string}', async function (userId: string) {
  try {
    const response = await world.apiClient
      .query({
        TableName: world.addressTableName,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
      .promise();

    world.currentResponse = response;
  } catch (error) {
    world.error = error;
  }
});

Then('each address should have the correct userId', function () {
  if (!world.currentResponse.Items) {
    throw new Error('No addresses found');
  }

  for (const address of world.currentResponse.Items) {
    if (address.userId !== world.currentResponse.Items[0].userId) {
      throw new Error('Address has incorrect userId');
    }
  }
});
