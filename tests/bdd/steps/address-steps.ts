import { Given, When, Then, Before, After, DataTable } from '@cucumber/cucumber';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

// World type for storing test context
interface AddressWorld {
  httpClient: AxiosInstance;
  currentResponse: any;
  lastAddressId: string;
  userId: string;
  addressData: any;
  error: any;
}

// Extend the World with our custom properties
const world: AddressWorld = {
  httpClient: null as any,
  currentResponse: null,
  lastAddressId: '',
  userId: '',
  addressData: {},
  error: null,
};

// Helper function to create Basic Auth header
function createBasicAuthHeader(clientId: string, clientSecret: string): string {
  const credentials = `${clientId}:${clientSecret}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

// Before hook - Initialize
Before(function () {
  const apiEndpoint = process.env.API_ENDPOINT;
  const testClientId = process.env.TEST_CLIENT_ID;
  const testClientSecret = process.env.TEST_CLIENT_SECRET;

  if (!apiEndpoint || !testClientId || !testClientSecret) {
    throw new Error(
      'Missing required environment variables: API_ENDPOINT, TEST_CLIENT_ID, TEST_CLIENT_SECRET'
    );
  }

  world.httpClient = axios.create({
    baseURL: apiEndpoint,
    headers: {
      Authorization: createBasicAuthHeader(testClientId, testClientSecret),
      'Content-Type': 'application/json',
    },
    validateStatus: () => true, // Don't throw on any status code
  });

  world.userId = `test_user_${uuidv4().substring(0, 8)}`;
  world.currentResponse = null;
  world.lastAddressId = '';
  world.addressData = {};
  world.error = null;
});

// After hook - Cleanup
After(async function () {
  // Cleanup is handled by API delete operations during tests
  // No additional cleanup needed
});

// Background steps
Given('the API is initialized', async function () {
  if (!world.httpClient) {
    throw new Error('HTTP client not initialized');
  }
});

Given('I am authenticated with valid credentials', async function () {
  // Authentication is set up in Before hook via Basic Auth
});

// Helper: Store address via API
async function storeAddress(addressData: any): Promise<void> {
  try {
    const response = await world.httpClient.post(`/users/${addressData.userId}/addresses`, {
      streetAddress: addressData.streetAddress,
      suburb: addressData.suburb,
      state: addressData.state,
      postcode: addressData.postcode,
      country: addressData.country,
    });

    world.currentResponse = response;
    if (response.status < 200 || response.status >= 300) {
      world.error = new Error(`API returned status ${response.status}: ${JSON.stringify(response.data)}`);
    } else {
      world.lastAddressId = response.data?.addressId || response.data?.id || '';
    }
  } catch (error) {
    world.error = error;
  }
}

// Helper: Query addresses via API
async function queryAddresses(userId: string, postcode?: string): Promise<any[]> {
  try {
    let url = `/users/${userId}/addresses`;
    if (postcode) {
      url += `?postcode=${postcode}`;
    }

    const response = await world.httpClient.get(url);
    world.currentResponse = response;
    
    if (response.status < 200 || response.status >= 300) {
      world.error = new Error(`API error ${response.status}: ${JSON.stringify(response.data)}`);
      return [];
    }
    
    return response.data?.addresses || response.data || [];
  } catch (error) {
    world.error = error;
    return [];
  }
}

// Helper: Delete address via API
async function deleteAddress(userId: string, addressId: string): Promise<void> {
  try {
    const response = await world.httpClient.delete(`/users/${userId}/addresses/${addressId}`);
    world.currentResponse = response;
    if (response.status < 200 || response.status >= 300) {
      world.error = new Error(`API error ${response.status}: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    world.error = error;
  }
}

// Store address steps
When('I store a new address with the following details:', async function (dataTable: DataTable) {
  const rows = dataTable.rowsHash();

  world.addressData = {
    userId: rows['userId'] || world.userId,
    streetAddress: rows['streetAddress'],
    suburb: rows['suburb'],
    state: rows['state'],
    postcode: rows['postcode'],
    country: rows['country'],
  };

  await storeAddress(world.addressData);

  if (!world.error) {
    world.addressData.addressId = world.lastAddressId;
  }
});

Then('the address should be created successfully', function () {
  if (world.error) {
    throw new Error(`Failed to create address: ${world.error.message}`);
  }
  if (!world.currentResponse) {
    throw new Error('No response from address creation');
  }
  if (world.currentResponse.status === 400 || world.currentResponse.status === 500) {
    throw new Error(`API error: ${JSON.stringify(world.currentResponse.data)}`);
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

  for (const row of rows) {
    await storeAddress({
      userId: world.userId,
      streetAddress: `${Math.random() * 1000} Test Street`,
      suburb: 'Test Suburb',
      state: 'NSW',
      postcode: row[0],
      country: 'Australia',
    });

    if (world.error) {
      throw new Error(`Failed to store address: ${world.error.message}`);
    }
  }
});

When('I retrieve addresses with postcode {string}', async function (postcode: string) {
  await queryAddresses(world.userId, postcode);
  if (world.error) {
    throw world.error;
  }
});

Then('I should get {int} address', function (count: number) {
  if (!world.currentResponse || !world.currentResponse.data) {
    throw new Error('No response received');
  }
  const items = Array.isArray(world.currentResponse.data) ? world.currentResponse.data : world.currentResponse.data.addresses || [];
  if (items.length !== count) {
    throw new Error(`Expected ${count} address(es), got ${items.length}`);
  }
});

Then('the address should have postcode {string}', function (postcode: string) {
  const items = Array.isArray(world.currentResponse.data) ? world.currentResponse.data : world.currentResponse.data.addresses || [];
  if (items.length === 0) {
    throw new Error('No addresses found');
  }
  const address = items[0];
  if (address.postcode !== postcode) {
    throw new Error(`Expected postcode ${postcode}, got ${address.postcode}`);
  }
});

// Filter by multiple postcodes
Given('I have stored addresses with the following details:', async function (dataTable: DataTable) {
  const rows = dataTable.hashes();

  for (const row of rows) {
    await storeAddress({
      userId: row['userId'],
      streetAddress: `${Math.random() * 1000} Test Street`,
      suburb: 'Test Suburb',
      state: 'NSW',
      postcode: row['postcode'],
      country: 'Australia',
    });

    if (world.error) {
      throw new Error(`Failed to store address: ${world.error.message}`);
    }
  }
});

When(
  'I retrieve addresses for user {string} with postcode {string}',
  async function (userId: string, postcode: string) {
    await queryAddresses(userId, postcode);
    if (world.error) {
      throw world.error;
    }
  }
);

Then('the address postcode should be {string}', function (postcode: string) {
  const items = Array.isArray(world.currentResponse.data) ? world.currentResponse.data : world.currentResponse.data.addresses || [];
  if (items.length === 0) {
    throw new Error('No addresses found');
  }
  const address = items[0];
  if (address.postcode !== postcode) {
    throw new Error(`Expected postcode ${postcode}, got ${address.postcode}`);
  }
});

// Update address steps
When('I update the address with the following changes:', async function (dataTable: DataTable) {
  const updates = dataTable.rowsHash();

  try {
    const response = await world.httpClient.patch(
      `/users/${world.addressData.userId}/addresses/${world.lastAddressId}`,
      updates
    );

    world.currentResponse = response;
    if (response.status < 200 || response.status >= 300) {
      world.error = new Error(`API error ${response.status}: ${JSON.stringify(response.data)}`);
    } else {
      Object.assign(world.addressData, updates);
    }
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

Then('the updated address should contain:', function (dataTable: DataTable) {
  const expected = dataTable.rowsHash();
  const data = world.currentResponse.data || {};

  for (const [key, value] of Object.entries(expected)) {
    if (data[key] !== value) {
      throw new Error(`Expected ${key} to be ${value}, got ${data[key]}`);
    }
  }
});

// Delete address steps
When('I delete the address', async function () {
  await deleteAddress(world.addressData.userId, world.lastAddressId);
  if (world.error) {
    throw world.error;
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
  const addresses = await queryAddresses(world.addressData.userId);
  const found = addresses.find((a) => a.addressId === world.lastAddressId);

  if (found) {
    throw new Error('Address still exists after deletion');
  }
});

// Validation steps
When('I attempt to store an address without a suburb', async function () {
  try {
    const response = await world.httpClient.post(`/users/${world.userId}/addresses`, {
      streetAddress: '123 Test Street',
      state: 'NSW',
      postcode: '2000',
      country: 'Australia',
    });

    world.currentResponse = response;
    if (response.status < 400) {
      world.error = new Error('Expected validation error but request succeeded');
    }
  } catch (error) {
    world.error = error;
  }
});

Then('the request should fail with validation error', function () {
  if (!world.error && world.currentResponse.status < 400) {
    throw new Error('Expected validation error but request succeeded');
  }
});

Then('the error message should mention {string}', function (keyword: string) {
  const errorMsg = world.error?.message || world.currentResponse?.data?.message || '';
  if (!errorMsg.includes(keyword)) {
    throw new Error(`Error message does not contain "${keyword}". Got: ${errorMsg}`);
  }
});

// Retrieve all addresses steps
Given(
  'I have stored multiple addresses for user {string}:',
  async function (userId: string, dataTable: DataTable) {
    const rows = dataTable.hashes();

    for (const row of rows) {
      await storeAddress({
        userId: userId,
        streetAddress: row['streetAddress'],
        suburb: row['suburb'],
        state: 'NSW',
        postcode: row['postcode'],
        country: 'Australia',
      });

      if (world.error) {
        throw new Error(`Failed to store address: ${world.error.message}`);
      }
    }
  }
);

When('I retrieve all addresses for user {string}', async function (userId: string) {
  await queryAddresses(userId);
  if (world.error) {
    throw world.error;
  }
});

Then('each address should have the correct userId', function () {
  const items = Array.isArray(world.currentResponse.data) ? world.currentResponse.data : world.currentResponse.data.addresses || [];
  if (!items || items.length === 0) {
    throw new Error('No addresses found');
  }

  const expectedUserId = items[0].userId;
  for (const address of items) {
    if (address.userId !== expectedUserId) {
      throw new Error('Address has incorrect userId');
    }
  }
});
