# Client Authentication Guide

## Overview

The User Address API uses HTTP Basic Authentication with client credentials (clientId + clientSecret). Clients must be registered and receive credentials before making API requests.

## Authentication Flow

### Phase 1: Client Credential Creation

#### Step 1: Generate Credentials

Call the `init-client` function to generate client credentials:

```bash
curl -X POST https://api.../dev/init-client \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "My Web App",
    "description": "Main client for web interface"
  }'
```

**Response:**
```json
{
  "message": "Client created successfully",
  "clientId": "client_a1b2c3d4...",
  "clientSecret": "7f3e2d1c9b8a7f6e...",
  "usage": "Save these credentials securely. They will only be shown once!"
}
```

⚠️ **IMPORTANT:** 
- Save the `clientSecret` immediately - it's only shown once
- Treat credentials like passwords
- Store securely (environment variables, secret management systems)

### Phase 2: Using the API

#### Step 2: Create Authorization Header

When making API requests, include HTTP Basic Authentication:

```bash
# Create base64 encoded credentials: clientId:clientSecret
BASE64=$(echo -n "client_a1b2c3d4:7f3e2d1c9b8a7f6e" | base64)

# Use in Authorization header
curl -X GET https://api.../dev/v1/users/user123/addresses \
  -H "Authorization: Basic $BASE64" \
  -H "Content-Type: application/json"
```

**JavaScript Example:**
```javascript
const clientId = 'client_a1b2c3d4...';
const clientSecret = '7f3e2d1c9b8a7f6e...';
const credentials = btoa(`${clientId}:${clientSecret}`);

fetch('https://api.../dev/v1/users/user123/addresses', {
  headers: {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json'
  }
});
```

**Python Example:**
```python
import requests
from requests.auth import HTTPBasicAuth

client_id = 'client_a1b2c3d4...'
client_secret = '7f3e2d1c9b8a7f6e...'

response = requests.get(
  'https://api.../dev/v1/users/user123/addresses',
  auth=HTTPBasicAuth(client_id, client_secret)
)
```

**cURL with -u flag (easiest):**
```bash
curl -X GET https://api.../dev/v1/users/user123/addresses \
  -u "client_a1b2c3d4:7f3e2d1c9b8a7f6e"
```

#### Step 3: Make API Requests

Once authenticated, you can use all API endpoints.

## Security Architecture

### How Authentication Works

```
1. Client sends request with Authorization header
   Authorization: Basic <base64(clientId:clientSecret)>
                 ↓
2. API Gateway routes to Lambda Authorizer
                 ↓
3. Authorizer decodes base64
   - Extracts clientId and clientSecret
                 ↓
4. Query ClientsTable for clientId
   - Retrieves stored clientSecret hash
                 ↓
5. Hash provided clientSecret with SHA-256
   - Compare with stored hash
                 ↓
6. If match: Allow request
   If no match: Return 401 Unauthorized
```

### SHA-256 Hashing

- Client secrets are **never stored in plaintext**
- Only SHA-256 hashes are stored in DynamoDB
- When a request arrives, the provided secret is hashed and compared
- If hashes match, authentication succeeds

**Example:**
```
Stored in DB:  SHA-256("client_secret_xyz") = "a1b2c3d4..."
Request:       "client_secret_xyz" → SHA-256 → "a1b2c3d4..." ✓ Match!
```

## Error Responses

### 401 Unauthorized - Missing Authorization Header

**Error:**
```json
{
  "message": "Unauthorized"
}
```

**Solution:** Include the Authorization header with valid credentials.

### 401 Unauthorized - Invalid Credentials

**Error:**
```json
{
  "message": "Unauthorized"
}
```

**Solution:** Verify clientId and clientSecret are correct and not expired.

### 401 Unauthorized - Invalid Header Format

**Error:**
```json
{
  "message": "Unauthorized"
}
```

**Solution:** Use proper Basic Auth format: `Authorization: Basic <base64(clientId:clientSecret)>`

## Best Practices

### ✅ DO

- ✅ Store credentials in environment variables
- ✅ Use secure secret management (AWS Secrets Manager, HashiCorp Vault)
- ✅ Rotate credentials periodically
- ✅ Use HTTPS only (never HTTP)
- ✅ Treat client secrets like passwords
- ✅ Regenerate credentials if compromised
- ✅ Monitor API usage for suspicious activity

### ❌ DON'T

- ❌ Commit credentials to version control
- ❌ Share credentials via email or chat
- ❌ Use the same credentials across environments
- ❌ Hardcode credentials in client applications
- ❌ Use HTTP (always use HTTPS)
- ❌ Log credentials in application logs
- ❌ Expose credentials in browser console or frontend code

## Creating Multiple Clients

You can create multiple clients for different applications:

```bash
# Client 1: Web Application
curl -X POST https://api.../dev/init-client \
  -H "Content-Type: application/json" \
  -d '{"clientName": "Web App", "description": "React web application"}'

# Client 2: Mobile App
curl -X POST https://api.../dev/init-client \
  -H "Content-Type: application/json" \
  -d '{"clientName": "Mobile App", "description": "iOS/Android native app"}'

# Client 3: Third-party Integration
curl -X POST https://api.../dev/init-client \
  -H "Content-Type: application/json" \
  -d '{"clientName": "Partner API", "description": "External partner integration"}'
```

Each client gets unique credentials and can be revoked independently.

## Environment Variables Setup

### .env Configuration

```bash
# .env.local or .env.dev
REACT_APP_API_ENDPOINT=https://api.../dev
REACT_APP_CLIENT_ID=client_a1b2c3d4...
REACT_APP_CLIENT_SECRET=7f3e2d1c9b8a7f6e...
```

### Application Initialization

```javascript
const api = axios.create({
  baseURL: process.env.REACT_APP_API_ENDPOINT,
  auth: {
    username: process.env.REACT_APP_CLIENT_ID,
    password: process.env.REACT_APP_CLIENT_SECRET
  }
});
```

## Troubleshooting

### Issue: 401 Unauthorized on all requests

**Possible Causes:**
1. clientId/clientSecret incorrect
2. Credentials not base64 encoded
3. Using HTTP instead of HTTPS
4. Client is inactive/deactivated
5. Authorization header malformed

**Solution:**
1. Verify credentials in init-client response
2. Test with cURL `-u` flag (handles encoding automatically)
3. Use HTTPS endpoint
4. Check client status in DynamoDB ClientsTable
5. Use format: `Authorization: Basic <base64>`

### Issue: 401 Unauthorized for specific endpoints

**Possible Causes:**
1. Token expired (if using JWT - not applicable here)
2. Incorrect client credentials
3. Client lacks permissions

**Solution:**
1. All credentials are permanent (no expiration)
2. Verify credentials
3. Check if client is active

## Rate Limiting

Each client has rate limits to prevent abuse:

- **Dev environment:** 500 requests/minute, 1000 burst
- **Prod environment:** 1000 requests/minute, 2000 burst

**Error:**
```json
{
  "message": "Rate limit exceeded"
}
```

**Solution:** Implement exponential backoff and retry logic.

## Monitoring Authentication

### CloudWatch Logs

View authentication attempts in CloudWatch:

```bash
# View authorizer logs
aws logs tail /aws/lambda/user-address-api-dev-ClientAuthorizer --follow
```

### Sample Log Entry

```
Authorization successful for client: client_a1b2c3d4
Method: GET, Resource: /v1/users/user123/addresses
```

## Reference

- **HTTP Basic Auth:** [RFC 7617](https://tools.ietf.org/html/rfc7617)
- **SHA-256:** [NIST FIPS 180-4](https://csrc.nist.gov/publications/detail/fips/180/4)
- **AWS API Gateway Authorizers:** [Documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-use-lambda-authorizer.html)
