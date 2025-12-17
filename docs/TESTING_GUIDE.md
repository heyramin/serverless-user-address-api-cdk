# Testing Guide

## Overview

This project uses Jest for both unit and integration tests. All tests are located in the `tests/` directory and must pass before deployment.

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Unit Tests Only
```bash
npm test -- tests/unit
```

### Run Integration Tests Only
```bash
npm test -- tests/integration
```

### Run Specific Test File
```bash
npm test -- store-address.test.ts
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

## Test Structure

### Unit Tests

Located in `tests/unit/`, these test individual Lambda functions in isolation.

**Directory:**
```
tests/unit/
├── store-address.test.ts       # Test address creation
├── get-addresses.test.ts       # Test address retrieval and filtering
├── update-address.test.ts      # Test address updates
├── delete-address.test.ts      # Test address deletion
├── authorize.test.ts           # Test HTTP Basic Auth authorizer
└── init-client.test.ts         # Test test credentials setup
```

### Integration Tests

Located in `tests/integration/`, these test complete API workflows against the actual Lambda handlers.

**Directory:**
```
tests/integration/
└── api.integration.test.ts     # Test complete API flows
```

## Unit Test Examples

### 1. Store Address Test

**File:** [tests/unit/store-address.test.ts](tests/unit/store-address.test.ts)

**What it tests:**
- Creating address with all required fields
- Creating address with optional addressType
- Validation of required fields (street, suburb, state, postcode)
- UUID generation for addressId
- Proper response structure
- **Duplicate address prevention** - returns 409 Conflict for duplicate addresses
- **Per-user duplicate check** - allows same address for different users
- **Case-insensitive comparison** - detects duplicates regardless of case

**Key Test Cases:**

1. **Valid address creation:**
   - Tests 201 Created response with addressId
   - Validates address object structure

2. **Duplicate address detection:**
   - Compares streetAddress, suburb, state, postcode, country, and addressType
   - Returns 409 Conflict with `DUPLICATE_ADDRESS` error code
   - Message: "An identical address already exists for this user"

3. **Cross-user duplicate handling:**
   - Different users can create identical addresses
   - Duplicate check is per-user only
   - No conflict when userId differs

**Example test:**
```typescript
it('should return 409 for duplicate address', async () => {
  const existingAddress = {
    userId: 'user_123',
    addressId: 'existing-id',
    streetAddress: '123 Main St',
    suburb: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    country: 'Australia',
    addressType: 'residential'
  };

  // Mock QueryCommand for duplicate check
  mockDocClient.send.mockResolvedValueOnce({
    Items: [existingAddress]
  });

  const event = {
    pathParameters: { userId: 'user_123' },
    body: JSON.stringify({
      streetAddress: '123 Main St',
      suburb: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      country: 'Australia',
      addressType: 'residential'
    })
  };

  const response = await handler(event);
  
  expect(response.statusCode).toBe(409);
  const body = JSON.parse(response.body);
  expect(body.error).toBe('DUPLICATE_ADDRESS');
});
```

**Implementation Details:**
- Uses DynamoDB `QueryCommand` to check existing user addresses
- Performs case-insensitive comparison by converting text fields to lowercase
- Whitespace is trimmed during schema validation before duplicate check
- Comparison includes all key address fields: streetAddress, suburb, state, postcode, country, addressType

### 2. Get Addresses Test

**File:** [tests/unit/get-addresses.test.ts](tests/unit/get-addresses.test.ts)

**What it tests:**
- Retrieving all addresses for a user
- Filtering by suburb
- Filtering by postcode
- Filtering by both suburb and postcode
- Empty results when no addresses match
- Proper response structure with pagination support

**Example test:**
```typescript
it('should retrieve addresses filtered by suburb', async () => {
  const mockAddresses = [
    {
      userId: 'user123',
      addressId: 'addr1',
      street: '123 Main St',
      suburb: 'Sydney',
      state: 'NSW',
      postcode: '2000'
    }
  ];

  const mockDynamoDbQuery = jest.fn().mockReturnValueOnce({
    promise: jest.fn().mockResolvedValueOnce({
      Items: mockAddresses
    })
  });

  AWS.DynamoDB.DocumentClient = jest.fn().mockImplementation(() => ({
    query: mockDynamoDbQuery
  }));

  const handler = require('../../src/handlers/get-addresses').handler;
  
  const event = {
    pathParameters: { userId: 'user123' },
    queryStringParameters: { suburb: 'Sydney' }
  };

  const response = await handler(event);
  
  expect(response.statusCode).toBe(200);
  const body = JSON.parse(response.body);
  expect(body.addresses.length).toBe(1);
  expect(body.addresses[0].suburb).toBe('Sydney');
});
```

### 3. Update Address Test

**File:** [tests/unit/update-address.test.ts](tests/unit/update-address.test.ts)

**What it tests:**
- Updating individual fields
- Updating addressType field
- Partial updates (not all fields required)
- Proper response structure
- Error when no fields to update
- Error when invalid addressType provided

**Example test:**
```typescript
it('should update suburb field successfully', async () => {
  const mockDynamoDbUpdate = jest.fn().mockReturnValueOnce({
    promise: jest.fn().mockResolvedValueOnce({
      Attributes: {
        userId: 'user123',
        addressId: 'addr1',
        suburb: 'Melbourne',
        updatedAt: new Date().toISOString()
      }
    })
  });

  AWS.DynamoDB.DocumentClient = jest.fn().mockImplementation(() => ({
    update: mockDynamoDbUpdate
  }));

  const handler = require('../../src/handlers/update-address').handler;
  
  const event = {
    pathParameters: { userId: 'user123', addressId: 'addr1' },
    body: JSON.stringify({ suburb: 'Melbourne' })
  };

  const response = await handler(event);
  
  expect(response.statusCode).toBe(200);
  const body = JSON.parse(response.body);
  expect(body.address.suburb).toBe('Melbourne');
});
```

### 4. Delete Address Test

**File:** [tests/unit/delete-address.test.ts](tests/unit/delete-address.test.ts)

**What it tests:**
- Deleting an address successfully
- Proper 204 No Content response
- Error handling for missing parameters

**Example test:**
```typescript
it('should delete an address successfully', async () => {
  const mockDynamoDbDelete = jest.fn().mockReturnValueOnce({
    promise: jest.fn().mockResolvedValueOnce({})
  });

  AWS.DynamoDB.DocumentClient = jest.fn().mockImplementation(() => ({
    delete: mockDynamoDbDelete
  }));

  const handler = require('../../src/handlers/delete-address').handler;
  
  const event = {
    pathParameters: { userId: 'user123', addressId: 'addr1' }
  };

  const response = await handler(event);
  
  expect(response.statusCode).toBe(204);
});
```

### 5. Authorization Test

**File:** [tests/unit/authorize.test.ts](tests/unit/authorize.test.ts)

**What it tests:**
- Valid HTTP Basic Auth credentials
- Invalid credentials
- Missing Authorization header
- SHA-256 hashing of credentials
- Proper authorizer response structure

**Example test:**
```typescript
it('should authorize valid credentials', async () => {
  const clientId = 'test-client-id';
  const clientSecret = 'test-client-secret';
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const handler = require('../../src/handlers/authorize').handler;
  
  const event = {
    authorizationToken: `Basic ${credentials}`,
    methodArn: 'arn:aws:execute-api:ap-southeast-2:123456789:api/dev/GET/'
  };

  const response = await handler(event);
  
  expect(response.principalId).toBe(clientId);
  expect(response.policyDocument.Statement[0].Effect).toBe('Allow');
});
```

## Integration Tests

**File:** [tests/integration/api.integration.test.ts](tests/integration/api.integration.test.ts)

Integration tests verify complete API workflows:

### Test Flow
```
1. Initialize client credentials
2. Create address
3. Retrieve addresses
4. Update address
5. Delete address
6. Verify deletion
```

**Example:**
```typescript
describe('User Address API - Integration Tests', () => {
  it('should complete full address lifecycle', async () => {
    // 1. Initialize client
    const clientRes = await initClient();
    const credentials = clientRes.credentials;

    // 2. Create address
    const createRes = await fetch(
      `${API_URL}/users/test-user/addresses`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          street: '123 Main St',
          suburb: 'Sydney',
          state: 'NSW',
          postcode: '2000',
          addressType: 'residential'
        })
      }
    );

    expect(createRes.status).toBe(201);
    const addressData = await createRes.json();
    const addressId = addressData.addressId;

    // 3. Retrieve address
    const getRes = await fetch(
      `${API_URL}/users/test-user/addresses?suburb=Sydney`,
      {
        headers: { 'Authorization': `Basic ${credentials}` }
      }
    );

    expect(getRes.status).toBe(200);

    // 4. Update address
    const updateRes = await fetch(
      `${API_URL}/users/test-user/addresses/${addressId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ suburb: 'Melbourne' })
      }
    );

    expect(updateRes.status).toBe(200);

    // 5. Delete address
    const deleteRes = await fetch(
      `${API_URL}/users/test-user/addresses/${addressId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Basic ${credentials}` }
      }
    );

    expect(deleteRes.status).toBe(204);
  });
});
```

## Mocking DynamoDB

The tests use Jest mocking to avoid hitting real DynamoDB during testing.

### Mock DynamoDB in Tests
```typescript
import AWS from 'aws-sdk';

jest.mock('aws-sdk');

// In test:
const mockDynamoDbPutItem = jest.fn().mockReturnValueOnce({
  promise: jest.fn().mockResolvedValueOnce({})
});

AWS.DynamoDB.DocumentClient = jest.fn().mockImplementation(() => ({
  put: mockDynamoDbPutItem
}));
```

### Common Mock Patterns

**Mock put (create):**
```typescript
const mockDynamoDbPutItem = jest.fn().mockReturnValueOnce({
  promise: jest.fn().mockResolvedValueOnce({})
});
```

**Mock query (read):**
```typescript
const mockDynamoDbQuery = jest.fn().mockReturnValueOnce({
  promise: jest.fn().mockResolvedValueOnce({
    Items: [{ addressId: 'addr1', street: '123 Main St' }]
  })
});
```

**Mock update:**
```typescript
const mockDynamoDbUpdate = jest.fn().mockReturnValueOnce({
  promise: jest.fn().mockResolvedValueOnce({
    Attributes: { addressId: 'addr1', suburb: 'Sydney' }
  })
});
```

**Mock delete:**
```typescript
const mockDynamoDbDelete = jest.fn().mockReturnValueOnce({
  promise: jest.fn().mockResolvedValueOnce({})
});
```

## Test Coverage

### Current Coverage Targets
- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

### Generate Coverage Report
```bash
npm run test:coverage
```

This creates a coverage report in `coverage/` directory. View the HTML report:
```bash
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

## Debugging Tests

### Run Specific Test in Debug Mode
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand store-address.test.ts
```

### Print Debug Information
```typescript
it('should create address', async () => {
  console.log('Event:', event);
  console.log('Response:', response);
  console.log('Mock calls:', mockDynamoDbPutItem.mock.calls);
});
```

### Use Debugger
```typescript
it('should create address', async () => {
  debugger; // Execution pauses here in debug mode
  const response = await handler(event);
});
```

## Test Data

### Sample Test User
```json
{
  "userId": "test-user-123",
  "addresses": [
    {
      "addressId": "550e8400-e29b-41d4-a716-446655440000",
      "street": "123 Main Street",
      "suburb": "Sydney",
      "state": "NSW",
      "postcode": "2000",
      "country": "Australia",
      "addressType": "residential"
    },
    {
      "addressId": "660f9501-f30c-52e5-b827-557766551111",
      "street": "456 Business Avenue",
      "suburb": "Melbourne",
      "state": "VIC",
      "postcode": "3000",
      "country": "Australia",
      "addressType": "billing"
    }
  ]
}
```

## Pre-Deployment Testing Checklist

Before deploying to production:

- [ ] Run `npm run build` - Verify TypeScript compilation
- [ ] Run `npm test` - All unit tests passing
- [ ] Run `npm test:coverage` - Coverage meets targets (>80%)
- [ ] Run integration tests against dev environment
- [ ] Test with actual credentials (not mocked)
- [ ] Verify error responses return correct status codes
- [ ] Test edge cases (special characters, long strings, null values)
- [ ] Verify rate limiting headers present
- [ ] Test with actual network latency
- [ ] Validate OpenAPI spec matches implementation

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to develop branch
- Commits to main branch

All tests must pass before merge to develop/main.

## Common Issues and Solutions

### Tests Timeout

**Problem:** Jest timeout after 5000ms

**Solution:**
```typescript
it('should handle long operations', async () => {
  // ...
}, 10000); // Increase timeout to 10 seconds
```

### Mock Not Working

**Problem:** DynamoDB calls still hitting real service

**Solution:** Ensure mock is set up BEFORE importing handler
```typescript
jest.mock('aws-sdk'); // Must be first

const handler = require('../../src/handlers/store-address').handler;
```

### UUID Generation Issues

**Problem:** Tests generate different UUIDs each run

**Solution:** Mock uuid in tests
```typescript
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'fixed-uuid-for-testing')
}));
```

## Useful Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Run specific test file
npm test -- store-address.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create"

# Generate coverage report
npm run test:coverage

# Clear Jest cache
npm test -- --clearCache

# Update snapshots (if using snapshot testing)
npm test -- -u
```
