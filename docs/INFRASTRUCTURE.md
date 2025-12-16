# Infrastructure Documentation

## Architecture Overview

The User Address API is a serverless REST API built on AWS using Infrastructure as Code (CDK). It provides CRUD operations for managing user addresses with authentication, encryption, and rate limiting.

```
┌──────────────────────────────────────────────────────────────────────┐
│                          AWS Cloud                                    │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │              API Gateway (REST API)                             │ │
│  │  Stage: {environment} (dev or prod)                            │ │
│  │                                                                 │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │ │
│  │  │ POST /v1/users │  │ GET /v1/users  │  │ PATCH/DELETE   │   │ │
│  │  │ /{id}/address  │  │ /{id}/address  │  │ /{id}/address  │   │ │
│  │  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘   │ │
│  └───────────┼──────────────────┼──────────────────┼─────────────┘ │
│              │                  │                  │                │
│  ┌───────────▼──────────────────▼──────────────────▼─────────────┐ │
│  │                                                               │ │
│  │          Lambda Authorizer (authorize.ts)                    │ │
│  │          ┌─────────────────────────────────────────┐         │ │
│  │          │ - Validates Authorization header       │         │ │
│  │          │ - HTTP Basic Auth (SHA-256 hashing)    │         │ │
│  │          │ - Queries ClientTable                  │         │ │
│  │          │ - Returns Allow/Deny policy            │         │ │
│  │          └─────────────────────────────────────────┘         │ │
│  └───────────┼──────────────────┼──────────────────┼─────────────┘ │
│              │                  │                  │                │
│  ┌───────────▼─────────┬────────▼─────────┬───────▼──────────────┐│
│  │                     │                  │                      ││
│  │  Store Address      │  Get Addresses   │  Update/Delete      ││
│  │  Lambda (Handler)   │  Lambda          │  Lambda             ││
│  │                     │                  │                      ││
│  │  Processes:         │  Processes:      │  Processes:         ││
│  │  - Validates input  │  - Queries table │  - Updates fields   ││
│  │  - Generates UUID   │  - Supports      │  - Validates input  ││
│  │  - Stores to DB     │    filtering     │  - Returns updated  ││
│  │  - Returns 201      │  - Returns 200   │    object           ││
│  │                     │                  │  - Returns 200/204  ││
│  └─────────┬───────────┴────────┬─────────┴───────┬──────────────┘│
│            │                    │                  │               │
│  ┌─────────▼────────────────────▼──────────────────▼─────────────┐ │
│  │                                                               │ │
│  │                    DynamoDB Tables                           │ │
│  │                                                               │ │
│  │  ┌──────────────────────┐    ┌────────────────────────────┐ │ │
│  │  │ user-addresses-{env} │    │ user-address-clients-{env} │ │ │
│  │  ├──────────────────────┤    ├────────────────────────────┤ │ │
│  │  │ PK: userId (STRING)  │    │ PK: clientId (STRING)      │ │ │
│  │  │ SK: addressId (UUID) │    │                            │ │ │
│  │  │                      │    │ Attributes:                │ │ │
│  │  │ Attributes:          │    │ - clientSecret (hashed)    │ │ │
│  │  │ - street             │    │ - active (BOOLEAN)         │ │ │
│  │  │ - suburb             │    │ - createdAt (ISO-8601)     │ │ │
│  │  │ - state              │    │ - updatedAt (ISO-8601)     │ │ │
│  │  │ - postcode           │    │                            │ │ │
│  │  │ - country            │    │ GSI: None                  │ │ │
│  │  │ - addressType        │    │ (clientId is partition key)│ │ │
│  │  │ - createdAt          │    └────────────────────────────┘ │ │
│  │  │ - updatedAt          │                                   │ │
│  │  │                      │    ┌────────────────────────────┐ │ │
│  │  │ GSI:                 │    │ suburb-index (GSI)         │ │ │
│  │  │ - suburbIndex        │    ├────────────────────────────┤ │ │
│  │  │   PK: userId         │    │ PK: userId                 │ │ │
│  │  │   SK: suburb         │    │ SK: suburb                 │ │ │
│  │  │   Projection: ALL    │    │ Projection: ALL            │ │ │
│  │  └──────────────────────┘    └────────────────────────────┘ │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│              │                                                      │
│  ┌───────────▼─────────────────────────────────────────────────┐  │
│  │                    KMS Key                                  │  │
│  │  - Customer-managed encryption key                         │  │
│  │  - Encrypts DynamoDB tables at rest                       │  │
│  │  - Key rotation enabled                                    │  │
│  │  - Alias: alias/user-address-api-{environment}            │  │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Addresses Table (`user-addresses-{environment}`)

**Partition Key:** `userId` (String)  
**Sort Key:** `addressId` (String)

| Attribute | Type | Description |
|-----------|------|-------------|
| userId | String | User identifier (partition key) |
| addressId | String | Unique address ID - UUID (sort key) |
| street | String | Street address |
| suburb | String | Suburb/city name |
| state | String | State abbreviation (NSW, VIC, etc) |
| postcode | String | Postal code |
| country | String | Country name (default: Australia) |
| addressType | String | Address type: billing, mailing, residential, business (optional) |
| createdAt | String | ISO-8601 timestamp of creation |
| updatedAt | String | ISO-8601 timestamp of last update |

**Global Secondary Index:** `suburbIndex`
- PK: `userId`
- SK: `suburb`
- Projection: ALL

### Clients Table (`user-address-clients-{environment}`)

**Partition Key:** `clientId` (String)

| Attribute | Type | Description |
|-----------|------|-------------|
| clientId | String | Unique client identifier (partition key) |
| clientSecret | String | SHA-256 hashed client secret |
| active | Boolean | Whether client is active |
| createdAt | String | ISO-8601 timestamp of creation |
| updatedAt | String | ISO-8601 timestamp of last update |

## Lambda Functions

### 1. Store Address Handler
- **File:** `src/handlers/store-address.ts`
- **Runtime:** Node.js 18.x
- **Triggers:** POST /v1/users/{userId}/addresses
- **Env Variables:** ADDRESSES_TABLE
- **Dependencies:** uuid, joi, @aws-sdk/client-dynamodb

**Request Body:**
```json
{
  "street": "123 Main St",
  "suburb": "Sydney",
  "state": "NSW",
  "postcode": "2000",
  "country": "Australia",
  "addressType": "residential"
}
```

**Response:** 201 Created
```json
{
  "message": "Address created successfully",
  "addressId": "uuid-here",
  "address": { /* full address object */ }
}
```

### 2. Get Addresses Handler
- **File:** `src/handlers/get-addresses.ts`
- **Runtime:** Node.js 18.x
- **Triggers:** GET /v1/users/{userId}/addresses
- **Query Parameters:** suburb, postcode
- **Env Variables:** ADDRESSES_TABLE

**Response:** 200 OK
```json
{
  "message": "Addresses retrieved successfully",
  "addresses": [ /* array of addresses */ ]
}
```

### 3. Update Address Handler
- **File:** `src/handlers/update-address.ts`
- **Runtime:** Node.js 18.x
- **Triggers:** PATCH /v1/users/{userId}/addresses/{addressId}
- **Env Variables:** ADDRESSES_TABLE

**Request Body:** (all fields optional)
```json
{
  "street": "456 New St",
  "suburb": "Melbourne",
  "state": "VIC",
  "postcode": "3000",
  "country": "Australia",
  "addressType": "billing"
}
```

**Response:** 200 OK
```json
{
  "message": "Address updated successfully",
  "address": { /* updated address object */ }
}
```

### 4. Delete Address Handler
- **File:** `src/handlers/delete-address.ts`
- **Runtime:** Node.js 18.x
- **Triggers:** DELETE /v1/users/{userId}/addresses/{addressId}
- **Env Variables:** ADDRESSES_TABLE

**Response:** 204 No Content

### 5. Authorizer Handler
- **File:** `src/handlers/authorize.ts`
- **Runtime:** Node.js 18.x
- **Triggers:** All API requests (via API Gateway Token Authorizer)
- **Auth Type:** HTTP Basic Auth
- **Env Variables:** CLIENTS_TABLE

## Deployment Configuration

### CDK Stack (`lib/user-address-api-stack.ts`)

**Stack Name:** `user-address-api-{environment}`

**Parameters:**
- `environment`: 'dev' | 'prod'

**Resources Created:**
1. KMS Encryption Key (customer-managed)
2. DynamoDB Tables (2)
3. Lambda Functions (6)
4. API Gateway REST API
5. Lambda Authorizer
6. Usage Plan & API Key

**Environment Naming:**
- Dev: Stage name = `dev`, Table names = `*-dev`
- Prod: Stage name = `prod`, Table names = `*-prod`

## Security

### Authentication
- HTTP Basic Auth with SHA-256 hashing
- Client credentials stored in DynamoDB
- Secrets hashed before storage

### Encryption
- DynamoDB tables encrypted with customer-managed KMS keys
- Keys have automatic rotation enabled
- 7-day waiting period for key deletion

### Authorizer
- Token-based authorizer with 0 second cache TTL (no caching)
- Returns policy with resource ARN
- Supports Allow/Deny decisions

## Monitoring & Logging

### CloudWatch Logs
- Each Lambda function logs to CloudWatch
- API Gateway logs request/response metadata
- Authorizer logs authorization decisions

### Metrics
- Lambda invocation count and duration
- DynamoDB read/write units
- API Gateway request count and latency

## Cost Optimization

- **Pay-per-request** billing mode for DynamoDB (no provisioned capacity)
- **Lambda:** Billed per 100ms invocation
- **Rate limiting:** Prevents excessive API usage

## Disaster Recovery

- **Point-in-time recovery** enabled on DynamoDB tables
- **Encryption key retention** policy (7-day waiting period)
- **Backup strategy:** Covered by PITR
