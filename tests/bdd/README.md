# BDD Tests with Cucumber

This directory contains Behavior-Driven Development (BDD) tests using Cucumber and Gherkin syntax.

## Overview

BDD tests provide a high-level, business-readable specification of the API functionality. They are located in:

- **Features**: `tests/bdd/features/` - Gherkin feature files describing user stories
- **Step Definitions**: `tests/bdd/steps/` - TypeScript implementations of Gherkin steps

## Features Covered

### Address Management
The main feature file covers the core functionality:

1. **Store Address** - Creating new addresses with validation
2. **Filter by Postcode** - Retrieving addresses by postal code
3. **Update Address** - Modifying existing address details
4. **Delete Address** - Removing addresses
5. **Validation** - Required field validation
6. **Bulk Operations** - Retrieving multiple addresses for a user

## Running BDD Tests

### Prerequisites
Ensure AWS credentials are configured and DynamoDB tables are accessible.

### Commands

```bash
# Run all BDD tests
npm run test:bdd

# Run specific feature
npx cucumber-js tests/bdd/features/address-management.feature

# Run with detailed output
npx cucumber-js tests/bdd/features/address-management.feature --format json:cucumber-report.json
```

## Test Data

BDD tests use:
- **DynamoDB tables**: `user-addresses-dev` and `user-address-clients-dev`
- **Auto-generated test data**: Each scenario generates unique test data that is cleaned up after execution
- **Consistent cleanup**: The `After` hook removes all created addresses after each scenario

## Environment Configuration

BDD tests use the following environment variables from `.env.bdd`:

```
ADDRESSES_TABLE_NAME=user-addresses-dev
CLIENT_TABLE_NAME=user-address-clients-dev
AWS_REGION=ap-southeast-2
DYNAMODB_ENDPOINT=http://localhost:8000  # Optional for local testing
NODE_ENV=test
```

## Test Scenarios

### Scenario 1: Store a New Address
- Creates a new address with all required fields
- Verifies the address is stored successfully
- Confirms an address ID is returned

### Scenario 2: Retrieve Addresses by Postcode
- Stores multiple addresses with different postcodes
- Retrieves addresses filtered by postcode
- Verifies correct filtering

### Scenario 3: Filter by Multiple Criteria
- Stores addresses for the same user with different postcodes
- Filters by user ID and postcode combination
- Validates returned addresses match criteria

### Scenario 4: Update an Address
- Creates an address
- Updates specific fields (street address, suburb)
- Confirms changes are persisted
- Validates other fields remain unchanged

### Scenario 5: Delete an Address
- Creates an address
- Deletes the address
- Confirms deletion by attempting retrieval
- Verifies no results are returned

### Scenario 6: Validate Required Fields
- Attempts to store address without required field (suburb)
- Expects validation error
- Confirms error message mentions the missing field

### Scenario 7: Retrieve All Addresses
- Stores multiple addresses for a user
- Retrieves all addresses for that user
- Confirms correct count and data

## Implementation Details

### Step Definitions

The step definitions are implemented in `tests/bdd/steps/address-steps.ts` and include:

**Given (Setup)**
- Initialize API
- Set up authentication
- Store test data

**When (Actions)**
- Store, update, delete addresses
- Retrieve addresses with various filters
- Attempt invalid operations

**Then (Assertions)**
- Verify successful operations
- Validate response structure and data
- Confirm error handling

### World Object

A `World` object maintains state across steps in a scenario:
- `apiClient` - DynamoDB client
- `currentResponse` - Last API response
- `lastAddressId` - ID of most recent address
- `addressData` - Current address being tested
- `addresses` - List of addresses for cleanup

### Cleanup

The `After` hook automatically:
1. Removes all addresses created during the test
2. Cleans up test data from DynamoDB
3. Ensures no test data persists between scenarios

## Adding New Tests

To add new BDD tests:

1. **Add scenarios** to `tests/bdd/features/address-management.feature`
2. **Implement step definitions** in `tests/bdd/steps/address-steps.ts`
3. **Run tests** with `npm run test:bdd`
4. **Update CI/CD** workflows if testing new features

Example step definition:

```typescript
When('I perform action X', async function () {
  try {
    world.currentResponse = await world.apiClient.performAction(...);
  } catch (error) {
    world.error = error;
  }
});

Then('the result should be Y', function () {
  if (world.currentResponse.result !== 'Y') {
    throw new Error(`Expected Y, got ${world.currentResponse.result}`);
  }
});
```

## CI/CD Integration

BDD tests are integrated into the deployment workflows:

- **dev branch** (`deploy-dev.yml`): Runs BDD tests before deploying to dev
- **prod deployment** (`deploy-prod.yml`): Runs BDD tests before deploying to prod

This ensures:
- Feature integrity before deployment
- Regression detection
- Business requirements validation
- API contract verification

## Troubleshooting

### DynamoDB Connection Issues
```bash
# Ensure AWS credentials are configured
aws sts get-caller-identity

# Check DynamoDB table exists
aws dynamodb list-tables --region ap-southeast-2
```

### Test Timeouts
- Increase timeout in `cucumber.js` if needed
- Check DynamoDB table capacity
- Verify network connectivity

### Step Definition Not Found
- Ensure step definitions are in `tests/bdd/steps/`
- Verify TypeScript compilation with `npm run build`
- Check Gherkin syntax matches step definitions exactly

## References

- [Cucumber.js Documentation](https://github.com/cucumber/cucumber-js)
- [Gherkin Syntax](https://cucumber.io/docs/gherkin/)
- [BDD Best Practices](https://cucumber.io/docs/bdd/)
