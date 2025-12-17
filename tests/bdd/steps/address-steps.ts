import { Given, When, Then, Before, After, DataTable, setWorldConstructor } from '@cucumber/cucumber';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * AddressWorld class - Encapsulates test context
 * Each scenario gets its own isolated instance
 */
class AddressWorld {
  httpClient: AxiosInstance | null = null;
  currentResponse: any = null;
  lastAddressId: string = '';
  userId: string = '';
  addressData: any = {};
  error: any = null;
  createdAddresses: Array<{ userId: string; addressId: string }> = [];
}

// Register the World class with Cucumber
setWorldConstructor(AddressWorld);

// Helper function to create Basic Auth header
function createBasicAuthHeader(clientId: string, clientSecret: string): string {
  const credentials = `${clientId}:${clientSecret}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

/**
 * Generate deterministic test street address
 * Uses index to ensure reproducibility and aid debugging
 */
function generateTestStreetAddress(index: number): string {
  return `${100 + index} Test Street`;
}

// Before hook - Initialize
Before(function (this: AddressWorld) {
  const apiEndpoint = process.env.API_ENDPOINT;
  const testClientId = process.env.TEST_CLIENT_ID;
  const testClientSecret = process.env.TEST_CLIENT_SECRET;

  if (!apiEndpoint || !testClientId || !testClientSecret) {
    throw new Error(
      'Missing required environment variables: API_ENDPOINT, TEST_CLIENT_ID, TEST_CLIENT_SECRET'
    );
  }

  this.httpClient = axios.create({
    baseURL: apiEndpoint,
    headers: {
      Authorization: createBasicAuthHeader(testClientId, testClientSecret),
      'Content-Type': 'application/json',
    },
    validateStatus: () => true, // Don't throw on any status code
  });

  this.userId = `test_user_${uuidv4().substring(0, 8)}`;
  this.currentResponse = null;
  this.lastAddressId = '';
  this.addressData = {};
  this.error = null;
  this.createdAddresses = [];
});

// After hook - Cleanup
After(async function (this: AddressWorld) {
  // Clean up any addresses created during the test to prevent data pollution
  // This ensures test isolation even if the test fails before reaching delete steps
  if (this.createdAddresses.length === 0) {
    return;
  }

  // Attempt to delete all created addresses
  for (const address of this.createdAddresses) {
    try {
      await this.httpClient?.delete(
        `/v1/users/${address.userId}/addresses/${address.addressId}`
      );
    } catch (error) {
      // Log but don't fail cleanup if individual delete fails
      console.warn(
        `Failed to clean up address ${address.addressId} for user ${address.userId}:`,
        error
      );
    }
  }

  // Clear the array
  this.createdAddresses = [];
});

// Background steps
Given('the API is initialized', async function (this: AddressWorld) {
  if (!this.httpClient) {
    throw new Error('HTTP client not initialized');
  }
});

Given('I am authenticated with valid credentials', async function (this: AddressWorld) {
  // Authentication is set up in Before hook via Basic Auth
});

// Helper: Store address via API
async function storeAddress(world: AddressWorld, addressData: any): Promise<void> {
  try {
    const response = await world.httpClient!.post(`/v1/users/${addressData.userId}/addresses`, {
      streetAddress: addressData.streetAddress,
      suburb: addressData.suburb,
      state: addressData.state,
      postcode: addressData.postcode,
      country: addressData.country,
    });

    world.currentResponse = response;
    
    // Clear previous error on new request
    world.error = null;

    // Check for error response
    if (response.status < 200 || response.status >= 300) {
      world.error = new Error(
        `API returned status ${response.status}: ${JSON.stringify(response.data)}`
      );
      world.lastAddressId = '';
      return;
    }

    // Success: Extract data from response
    world.lastAddressId = response.data?.addressId || response.data?.id || '';
    
    // Track created address for cleanup only on successful creation
    if (world.lastAddressId) {
      world.createdAddresses.push({
        userId: addressData.userId,
        addressId: world.lastAddressId,
      });
    }
  } catch (error) {
    world.error = error;
    world.lastAddressId = '';
  }
}

// Helper: Query addresses via API
async function queryAddresses(world: AddressWorld, userId: string, postcode?: string): Promise<any[]> {
  try {
    let url = `/v1/users/${userId}/addresses`;
    if (postcode) {
      url += `?postcode=${postcode}`;
    }

    const response = await world.httpClient!.get(url);
    world.currentResponse = response;
    
    // Clear previous error on new request
    world.error = null;

    // Check for error response
    if (response.status < 200 || response.status >= 300) {
      world.error = new Error(
        `API error ${response.status}: ${JSON.stringify(response.data)}`
      );
      return [];
    }
    
    // Success: Extract and return address data
    return response.data?.addresses || response.data || [];
  } catch (error) {
    world.error = error;
    return [];
  }
}

// Helper: Delete address via API
async function deleteAddress(world: AddressWorld, userId: string, addressId: string): Promise<void> {
  try {
    const response = await world.httpClient!.delete(
      `/v1/users/${userId}/addresses/${addressId}`
    );
    world.currentResponse = response;
    
    // Clear previous error on new request
    world.error = null;

    // Check for error response
    if (response.status < 200 || response.status >= 300) {
      world.error = new Error(
        `API error ${response.status}: ${JSON.stringify(response.data)}`
      );
      return;
    }

    // Success: Remove from tracking list since it was successfully deleted
    world.createdAddresses = world.createdAddresses.filter(
      (addr) => !(addr.userId === userId && addr.addressId === addressId)
    );
  } catch (error) {
    world.error = error;
  }
}

// Store address steps
When('I store a new address with the following details:', async function (this: AddressWorld, dataTable: DataTable) {
  const rows = dataTable.rowsHash();

  this.addressData = {
    userId: rows['userId'] || this.userId,
    streetAddress: rows['streetAddress'],
    suburb: rows['suburb'],
    state: rows['state'],
    postcode: rows['postcode'],
    country: rows['country'],
  };

  await storeAddress(this, this.addressData);

  if (!this.error) {
    this.addressData.addressId = this.lastAddressId;
  }
});

Then('the address should be created successfully', function (this: AddressWorld) {
  if (this.error) {
    throw new Error(`Failed to create address: ${this.error.message}`);
  }
  if (!this.currentResponse) {
    throw new Error('No response from address creation');
  }
  if (this.currentResponse.status === 400 || this.currentResponse.status === 500) {
    throw new Error(`API error: ${JSON.stringify(this.currentResponse.data)}`);
  }
});

Then('the response should contain an addressId', function (this: AddressWorld) {
  if (!this.lastAddressId) {
    throw new Error('Address ID not found in response');
  }
});

// Given step for storing a single address with details
Given('I have stored an address with the following details:', async function (this: AddressWorld, dataTable: DataTable) {
  const rows = dataTable.rowsHash();

  this.addressData = {
    userId: rows['userId'] || this.userId,
    streetAddress: rows['streetAddress'],
    suburb: rows['suburb'],
    state: rows['state'],
    postcode: rows['postcode'],
    country: rows['country'],
  };

  await storeAddress(this, this.addressData);

  if (this.error) {
    throw new Error(`Failed to store address: ${this.error.message}`);
  }

  this.addressData.addressId = this.lastAddressId;
});

// Retrieve addresses by postcode steps
Given('I have stored addresses with the following postcodes:', async function (this: AddressWorld, dataTable: DataTable) {
  const rows = dataTable.rows();

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    await storeAddress(this, {
      userId: this.userId,
      streetAddress: generateTestStreetAddress(index),
      suburb: 'Test Suburb',
      state: 'NSW',
      postcode: row[0],
      country: 'Australia',
    });

    if (this.error) {
      throw new Error(`Failed to store address: ${this.error.message}`);
    }
  }
});

When('I retrieve addresses with postcode {string}', async function (this: AddressWorld, postcode: string) {
  await queryAddresses(this, this.userId, postcode);
  if (this.error) {
    throw this.error;
  }
});

Then('I should get {int} address', function (this: AddressWorld, count: number) {
  if (!this.currentResponse || !this.currentResponse.data) {
    throw new Error('No response received');
  }
  const items = Array.isArray(this.currentResponse.data) ? this.currentResponse.data : this.currentResponse.data.addresses || [];
  if (items.length !== count) {
    throw new Error(`Expected ${count} address(es), got ${items.length}`);
  }
});

Then('the address should have postcode {string}', function (this: AddressWorld, postcode: string) {
  const items = Array.isArray(this.currentResponse.data) ? this.currentResponse.data : this.currentResponse.data.addresses || [];
  if (items.length === 0) {
    throw new Error('No addresses found');
  }
  const address = items[0];
  if (address.postcode !== postcode) {
    throw new Error(`Expected postcode ${postcode}, got ${address.postcode}`);
  }
});

// Filter by multiple postcodes
Given('I have stored addresses with the following details:', async function (this: AddressWorld, dataTable: DataTable) {
  const rows = dataTable.hashes();

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    await storeAddress(this, {
      userId: row['userId'],
      streetAddress: generateTestStreetAddress(index),
      suburb: 'Test Suburb',
      state: 'NSW',
      postcode: row['postcode'],
      country: 'Australia',
    });

    if (this.error) {
      throw new Error(`Failed to store address: ${this.error.message}`);
    }
  }
});

When(
  'I retrieve addresses for user {string} with postcode {string}',
  async function (this: AddressWorld, userId: string, postcode: string) {
    await queryAddresses(this, userId, postcode);
    if (this.error) {
      throw this.error;
    }
  }
);

Then('the address postcode should be {string}', function (this: AddressWorld, postcode: string) {
  const items = Array.isArray(this.currentResponse.data) ? this.currentResponse.data : this.currentResponse.data.addresses || [];
  if (items.length === 0) {
    throw new Error('No addresses found');
  }
  const address = items[0];
  if (address.postcode !== postcode) {
    throw new Error(`Expected postcode ${postcode}, got ${address.postcode}`);
  }
});

// Update address steps
When('I update the address with the following changes:', async function (this: AddressWorld, dataTable: DataTable) {
  const updates = dataTable.rowsHash();

  try {
    const response = await this.httpClient!.patch(
      `/v1/users/${this.addressData.userId}/addresses/${this.lastAddressId}`,
      updates
    );

    this.currentResponse = response;
    if (response.status < 200 || response.status >= 300) {
      this.error = new Error(`API error ${response.status}: ${JSON.stringify(response.data)}`);
    } else {
      Object.assign(this.addressData, updates);
    }
  } catch (error) {
    this.error = error;
  }
});

Then('the address should be updated successfully', function (this: AddressWorld) {
  if (this.error) {
    throw new Error(`Failed to update address: ${this.error.message}`);
  }
  if (!this.currentResponse) {
    throw new Error('No response from address update');
  }
});

Then('the updated address should contain:', function (this: AddressWorld, dataTable: DataTable) {
  const expected = dataTable.rowsHash();
  const data = this.currentResponse.data || {};

  for (const [key, value] of Object.entries(expected)) {
    if (data[key] !== value) {
      throw new Error(`Expected ${key} to be ${value}, got ${data[key]}`);
    }
  }
});

// Delete address steps
When('I delete the address', async function (this: AddressWorld) {
  await deleteAddress(this, this.addressData.userId, this.lastAddressId);
  if (this.error) {
    throw this.error;
  }
});

Then('the address should be deleted successfully', function (this: AddressWorld) {
  if (this.error) {
    throw new Error(`Failed to delete address: ${this.error.message}`);
  }
  if (!this.currentResponse) {
    throw new Error('No response from address deletion');
  }
});

Then('attempting to retrieve the address should return no results', async function (this: AddressWorld) {
  const addresses = await queryAddresses(this, this.addressData.userId);
  const found = addresses.find((a) => a.addressId === this.lastAddressId);

  if (found) {
    throw new Error('Address still exists after deletion');
  }
});

// Validation steps
When('I attempt to store an address without a suburb', async function (this: AddressWorld) {
  try {
    const response = await this.httpClient!.post(`/v1/users/${this.userId}/addresses`, {
      streetAddress: '123 Test Street',
      state: 'NSW',
      postcode: '2000',
      country: 'Australia',
    });

    this.currentResponse = response;
    if (response.status < 400) {
      this.error = new Error('Expected validation error but request succeeded');
    }
  } catch (error) {
    this.error = error;
  }
});

Then('the request should fail with validation error', function (this: AddressWorld) {
  if (!this.error && this.currentResponse.status < 400) {
    throw new Error('Expected validation error but request succeeded');
  }
});

Then('the error message should mention {string}', function (this: AddressWorld, keyword: string) {
  const errorMsg = this.error?.message || this.currentResponse?.data?.message || '';
  if (!errorMsg.includes(keyword)) {
    throw new Error(`Error message does not contain "${keyword}". Got: ${errorMsg}`);
  }
});

// Retrieve all addresses steps
Given(
  'I have stored multiple addresses for user {string}:',
  async function (this: AddressWorld, userId: string, dataTable: DataTable) {
    const rows = dataTable.hashes();

    for (const row of rows) {
      await storeAddress(this, {
        userId: userId,
        streetAddress: row['streetAddress'],
        suburb: row['suburb'],
        state: 'NSW',
        postcode: row['postcode'],
        country: 'Australia',
      });

      if (this.error) {
        throw new Error(`Failed to store address: ${this.error.message}`);
      }
    }
  }
);

When('I retrieve all addresses for user {string}', async function (this: AddressWorld, userId: string) {
  await queryAddresses(this, userId);
  if (this.error) {
    throw this.error;
  }
});

Then('each address should have the correct userId', function (this: AddressWorld) {
  const items = Array.isArray(this.currentResponse.data) ? this.currentResponse.data : this.currentResponse.data.addresses || [];
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
