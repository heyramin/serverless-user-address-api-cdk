# Troubleshooting Guide

## Overview

This guide provides solutions for common issues encountered when using the User Address API.

## Authentication Issues

### Error: "Unauthorized" or 401 Response

**Symptoms:**
- All requests return 401 Unauthorized
- "Unauthorized" message in response body
- Errors even with credentials included

**Causes:**
1. Invalid credentials
2. Incorrect Base64 encoding
3. Missing Authorization header
4. Credentials not initialized

**Solutions:**

**1. Verify credentials are initialized**
```bash
# Initialize test credentials
curl -X POST https://api.../init-client \
  -H "Content-Type: application/json" \
  -d '{"clientId": "test-client", "clientSecret": "test-secret"}'
```

**2. Verify Base64 encoding**
```bash
# Correct encoding format
CREDENTIALS=$(echo -n "clientId:clientSecret" | base64)
echo $CREDENTIALS  # Should output: Y2xpZW50SWQ6Y2xpZW50U2VjcmV0

# Incorrect: Space after echo
CREDENTIALS=$(echo "clientId:clientSecret" | base64)  # Extra newline added!
```

**3. Verify Authorization header format**
```bash
# Correct
curl -X GET https://api.../v1/users/user123/addresses \
  -H "Authorization: Basic Y2xpZW50SWQ6Y2xpZW50U2VjcmV0"

# Incorrect (missing "Basic")
curl -X GET https://api.../v1/users/user123/addresses \
  -H "Authorization: Y2xpZW50SWQ6Y2xpZW50U2VjcmV0"

# Incorrect (wrong scheme)
curl -X GET https://api.../v1/users/user123/addresses \
  -H "Authorization: Bearer Y2xpZW50SWQ6Y2xpZW50U2VjcmV0"
```

**4. Test with known-good credentials**
```bash
# Use standard test credentials
CLIENT_ID="test-client"
CLIENT_SECRET="test-secret"
CREDENTIALS=$(echo -n "$CLIENT_ID:$CLIENT_SECRET" | base64)

curl -X GET "https://api.../v1/users/user123/addresses" \
  -H "Authorization: Basic $CREDENTIALS" \
  -v  # Verbose to see all headers
```

**5. Check credentials in database**
```bash
# View stored credentials in DynamoDB
aws dynamodb scan \
  --table-name clients \
  --region ap-southeast-2 \
  --query 'Items[0]'
```

### Error: "Invalid Authorization Header" or 400 Response

**Symptoms:**
- 400 Bad Request with "Invalid Authorization Header"
- Token not recognized

**Solutions:**

**1. Check header format**
```bash
# Must be "Basic" scheme, not "Bearer" or other
Authorization: Basic <base64(clientId:clientSecret)>
```

**2. Verify colon separator**
```bash
# Correct format: clientId:clientSecret
echo -n "myClientId:myClientSecret" | base64

# Incorrect format (no colon)
echo -n "myClientIdmyClientSecret" | base64
```

**3. Avoid extra whitespace**
```bash
# WRONG - echo adds newline
CREDENTIALS=$(echo "clientId:clientSecret" | base64)

# CORRECT - echo -n prevents newline
CREDENTIALS=$(echo -n "clientId:clientSecret" | base64)
```

---

## Validation Errors

### Error: "Validation failed" or 400 Response

**Symptoms:**
- 400 Bad Request with validation error message
- Error message shows missing required fields
- Example: `"street" is required`

**Solutions:**

**1. Check required fields for Create Address**
```bash
# Required fields: street, suburb, state, postcode
curl -X POST https://api.../v1/users/user123/addresses \
  -u "clientId:clientSecret" \
  -H "Content-Type: application/json" \
  -d '{
    "street": "123 Main Street",
    "suburb": "Sydney",
    "state": "NSW",
    "postcode": "2000"
  }'
```

**2. Validate addressType field**
```bash
# Valid values: billing, mailing, residential, business
# Or omit for no address type

# Valid
"addressType": "residential"

# Invalid
"addressType": "home"  # Returns: Invalid addressType
```

**3. Verify JSON structure**
```bash
# WRONG - missing comma
curl -X POST https://api.../v1/users/user123/addresses \
  -u "clientId:clientSecret" \
  -H "Content-Type: application/json" \
  -d '{
    "street": "123 Main Street"
    "suburb": "Sydney"
  }'

# CORRECT
curl -X POST https://api.../v1/users/user123/addresses \
  -u "clientId:clientSecret" \
  -H "Content-Type: application/json" \
  -d '{
    "street": "123 Main Street",
    "suburb": "Sydney"
  }'
```

**4. Test with minimal valid payload**
```bash
# Minimal valid payload for Create Address
curl -X POST https://api.../v1/users/user123/addresses \
  -u "clientId:clientSecret" \
  -H "Content-Type: application/json" \
  -d '{
    "street": "123 Main Street",
    "suburb": "Sydney",
    "state": "NSW",
    "postcode": "2000"
  }'
```

### Error: "Invalid addressType" or 400 Response

**Symptoms:**
- Update fails with addressType validation error
- Error: "Invalid addressType. Must be one of: billing, mailing, residential, business"

**Solutions:**

```bash
# Valid addressType values
"addressType": "billing"      # For billing address
"addressType": "mailing"      # For mailing address
"addressType": "residential"  # For home address
"addressType": "business"     # For business address

# Incorrect values (will fail validation)
"addressType": "home"         # Not valid
"addressType": "RESIDENTIAL"  # Case-sensitive - must be lowercase
"addressType": "primary"      # Not valid
```

---

## API Response Errors

### Error: 500 Internal Server Error

**Symptoms:**
- 500 response code
- Generic "Internal server error" message
- No details about what went wrong

**Solutions:**

**1. Check CloudWatch logs**
```bash
# View Lambda function logs
aws logs tail /aws/lambda/UserAddressApiStack-StoreAddressFunction \
  --follow \
  --region ap-southeast-2 \
  --log-stream-name-prefix "2024"
```

**2. Check Lambda function code**
```bash
# Verify function is deployed
aws lambda list-functions \
  --region ap-southeast-2 \
  --query 'Functions[?contains(FunctionName, `StoreAddress`)].{Name:FunctionName,LastModified:LastModified}'
```

**3. Test Lambda directly**
```bash
# Invoke Lambda directly to see raw error
aws lambda invoke \
  --function-name UserAddressApiStack-StoreAddressFunction \
  --region ap-southeast-2 \
  --payload '{"pathParameters":{"userId":"user123"},"body":"{\"street\":\"123 Main\",\"suburb\":\"Sydney\",\"state\":\"NSW\",\"postcode\":\"2000\"}"}' \
  response.json

cat response.json
```

**4. Check DynamoDB table permissions**
```bash
# Verify table exists and is accessible
aws dynamodb describe-table \
  --table-name addresses \
  --region ap-southeast-2
```

**5. Check KMS key permissions**
```bash
# Verify encryption key is accessible
aws kms describe-key \
  --key-id "arn:aws:kms:ap-southeast-2:..." \
  --region ap-southeast-2
```

### Error: "Missing userId" or 400 Response

**Symptoms:**
- 400 Bad Request with "Missing userId"
- URL path incomplete

**Solutions:**

```bash
# Correct format - userId in path
curl -X GET https://api.../v1/users/user123/addresses

# Incorrect - missing userId
curl -X GET https://api.../v1/users//addresses

# Incorrect - userId in query string instead of path
curl -X GET "https://api.../v1/addresses?userId=user123"
```

### Error: "No fields to update" or 400 Response

**Symptoms:**
- PATCH request returns 400
- Error message: "No fields to update"

**Solutions:**

```bash
# Include at least one field to update
curl -X PATCH https://api.../v1/users/user123/addresses/addr-id \
  -u "clientId:clientSecret" \
  -H "Content-Type: application/json" \
  -d '{
    "suburb": "Melbourne"
  }'

# WRONG - empty body
curl -X PATCH https://api.../v1/users/user123/addresses/addr-id \
  -u "clientId:clientSecret" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Network and Connection Issues

### Error: Connection Refused or Cannot Connect

**Symptoms:**
- `curl: (7) Failed to connect`
- `Connection refused`
- Timeout errors

**Solutions:**

**1. Verify API endpoint is correct**
```bash
# Check deployed endpoint
aws apigateway get-rest-apis \
  --region ap-southeast-2 \
  --query 'items[0].{id:id,name:name}'

aws apigateway get-stages \
  --rest-api-id <api-id> \
  --region ap-southeast-2
```

**2. Verify API Gateway stage is deployed**
```bash
# Check stage status
aws apigateway get-stage \
  --rest-api-id <api-id> \
  --stage-name dev \
  --region ap-southeast-2
```

**3. Test connectivity**
```bash
# Use curl with verbose output
curl -v https://api.../v1/users/user123/addresses \
  -u "clientId:clientSecret"

# Or use wget
wget --verbose https://api.../v1/users/user123/addresses \
  --header="Authorization: Basic clientId:clientSecret"
```

**4. Check if Lambda function is active**
```bash
# Verify function state
aws lambda get-function \
  --function-name UserAddressApiStack-StoreAddressFunction \
  --region ap-southeast-2 \
  --query 'Configuration.State'
```

### Error: Timeout or Slow Responses

**Symptoms:**
- Request hangs for 30+ seconds
- `curl: (28) Operation timeout`
- Intermittent timeouts

**Solutions:**

**1. Check Lambda execution time**
```bash
# View Lambda duration metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=UserAddressApiStack-StoreAddressFunction \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --region ap-southeast-2
```

**2. Check DynamoDB throttling**
```bash
# View consumed capacity
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedWriteCapacityUnits \
  --dimensions Name=TableName,Value=addresses \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --region ap-southeast-2
```

**3. Increase Lambda timeout**
```bash
# Lambda default timeout is 3 seconds
# Update in CDK and redeploy
# See: lib/user-address-api-stack.ts
```

**4. Increase DynamoDB capacity**
```bash
# If on provisioned capacity, increase capacity
aws dynamodb update-table \
  --table-name addresses \
  --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=10 \
  --region ap-southeast-2
```

---

## Data Issues

### Error: Address Not Found After Creation

**Symptoms:**
- Create returns 201 with addressId
- Get returns empty list
- Address was created but cannot be retrieved

**Solutions:**

**1. Verify write succeeded**
```bash
# Check response from Create
curl -X POST https://api.../v1/users/user123/addresses \
  -u "clientId:clientSecret" \
  -H "Content-Type: application/json" \
  -d '{...}' \
  -v  # Verbose to see all details

# Should show "201 Created" in response headers
```

**2. Check DynamoDB table directly**
```bash
# Query DynamoDB for user's addresses
aws dynamodb query \
  --table-name addresses \
  --key-condition-expression "userId = :userId" \
  --expression-attribute-values '{":userId":{"S":"user123"}}' \
  --region ap-southeast-2
```

**3. Verify item was actually created**
```bash
# Scan table for all addresses
aws dynamodb scan \
  --table-name addresses \
  --region ap-southeast-2 \
  --limit 10
```

**4. Check DynamoDB encryption settings**
```bash
# Verify table encryption
aws dynamodb describe-table \
  --table-name addresses \
  --region ap-southeast-2 \
  --query 'Table.SSEDescription'
```

### Error: Duplicate Addresses Created

**Symptoms:**
- Same address created multiple times
- Multiple addresses with same data but different IDs

**Solutions:**

**1. Check for duplicate requests**
```bash
# Add logging to identify duplicate requests
# Look at CloudWatch logs for multiple identical requests
aws logs tail /aws/lambda/UserAddressApiStack-StoreAddressFunction \
  --follow \
  --region ap-southeast-2
```

**2. Implement idempotency**
```bash
# Use Idempotency-Key header (if implemented)
curl -X POST https://api.../v1/users/user123/addresses \
  -u "clientId:clientSecret" \
  -H "Idempotency-Key: unique-request-id" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**3. Check client retry logic**
```javascript
// Ensure client doesn't retry on success
const response = await fetch(url, options);
if (response.status === 201) {
  // Success - don't retry
  return await response.json();
}
// Only retry on specific error statuses
```

---

## Local Development Issues

### Error: MongoDB Connection Failed

**Symptoms:**
- `MongoError: connect ECONNREFUSED`
- Tests failing with database connection errors

**Solutions:**

**1. Start MongoDB with Docker**
```bash
# Start MongoDB container
docker-compose up

# Verify it's running
docker ps | grep mongo
```

**2. Check MongoDB port**
```bash
# Default MongoDB port is 27017
# Verify it's listening
lsof -i :27017

# Or with netstat
netstat -an | grep 27017
```

**3. Check MongoDB connection string**
```bash
# Verify in environment or config
echo $MONGODB_URI
# Should be: mongodb://localhost:27017/mydb
```

### Error: Tests Timing Out

**Symptoms:**
- Jest timeout after 5000ms
- Test never completes
- `Jest has detected the following 1 open handle...`

**Solutions:**

**1. Increase Jest timeout**
```typescript
it('should handle slow operations', async () => {
  // test code
}, 30000); // Increase timeout to 30 seconds
```

**2. Close database connections**
```typescript
afterAll(async () => {
  // Close DynamoDB connection
  await dynamoClient.close();
});
```

**3. Clear mocks between tests**
```typescript
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

---

## AWS Permissions Issues

### Error: "User is not authorized" or Access Denied

**Symptoms:**
- AWS API calls fail with access denied
- IAM errors during deployment

**Solutions:**

**1. Check IAM permissions**
```bash
# View current user
aws sts get-caller-identity

# Check permissions for specific action
aws iam get-user-policy --user-name <username> --policy-name <policy>
```

**2. Add required permissions**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction",
        "lambda:CreateFunction",
        "dynamodb:Query",
        "dynamodb:GetItem"
      ],
      "Resource": "*"
    }
  ]
}
```

**3. Verify API Gateway authorizer is configured**
```bash
# Check authorizer
aws apigateway get-authorizers \
  --rest-api-id <api-id> \
  --region ap-southeast-2
```

---

## Performance Issues

### Slow API Responses

**Symptoms:**
- Requests taking 10+ seconds
- Intermittent slow responses
- DynamoDB throttling

**Solutions:**

**1. Monitor Lambda duration**
```bash
# Check how long Lambda functions are running
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=UserAddressApiStack-GetAddressesFunction \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average,Maximum \
  --region ap-southeast-2
```

**2. Check DynamoDB hot partitions**
```bash
# Monitor consumed capacity
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=addresses \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --region ap-southeast-2
```

**3. Optimize database queries**
```bash
# Use indexes efficiently
# See: docs/INFRASTRUCTURE.md for query patterns
```

**4. Cache frequently accessed data**
```javascript
// Implement caching in Lambda
const addressCache = new Map();

function getCachedAddress(userId, addressId) {
  const key = `${userId}:${addressId}`;
  return addressCache.get(key);
}
```

---

## Getting Help

If issues persist:

1. **Check CloudWatch Logs**
   ```bash
   aws logs tail /aws/lambda/UserAddressApiStack \
     --follow \
     --region ap-southeast-2
   ```

2. **Review CloudFormation Events**
   ```bash
   aws cloudformation describe-stack-events \
     --stack-name UserAddressApiStack \
     --region ap-southeast-2
   ```

3. **Check AWS Service Health**
   - https://health.aws.amazon.com/phd

4. **Review Documentation**
   - [INFRASTRUCTURE.md](INFRASTRUCTURE.md)
   - [CLIENT_AUTHENTICATION.md](CLIENT_AUTHENTICATION.md)
   - [API_REFERENCE.md](API_REFERENCE.md)

5. **Enable Debug Logging**
   ```bash
   # Increase Lambda logging level
   NODE_DEBUG=* npm test
   ```
