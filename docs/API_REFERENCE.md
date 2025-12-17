# API Reference

## Overview

The User Address API provides REST endpoints for managing user addresses. All requests require HTTP Basic Authentication with client credentials.

**Base URL:**
```
https://api.../dev/v1  (Development)
https://api.../prod/v1 (Production)
```

**Authentication:** HTTP Basic Auth (clientId:clientSecret)

## Endpoints

### 1. Create Address

Creates a new address for a user.

**Request:**
```http
POST /v1/users/{userId}/addresses
Authorization: Basic <base64(clientId:clientSecret)>
Content-Type: application/json
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | Unique user identifier (alphanumeric, hyphens, underscores only) |

**Request Body:**
```json
{
  "streetAddress": "123 Main Street",
  "suburb": "Sydney",
  "state": "NSW",
  "postcode": "2000",
  "country": "Australia",
  "addressType": "residential"
}
```

**Request Body Fields:**
| Field | Type | Required | Format | Description |
|-------|------|----------|--------|-------------|
| streetAddress | string | Yes | Alphanumeric + spaces, hyphens, apostrophes, periods, commas, # | Street address line (supports unit numbers like "123-A", "Level #5") |
| suburb | string | Yes | Alphanumeric + spaces, hyphens, apostrophes, periods | Suburb or city name |
| state | string | Yes | NSW, VIC, QLD, WA, SA, TAS, ACT, NT | Australian state/territory code |
| postcode | string | Yes | 4 digits (0000-9999) | Australian postcode |
| country | string | No | Alphanumeric + spaces, hyphens, apostrophes | Country name (defaults to Australia) |
| addressType | string | No | billing, mailing, residential, business | Type of address |

**Validation Rules:**
- `userId`: 1-128 characters, only alphanumeric characters, hyphens (-), and underscores (_) allowed
- `streetAddress`: Supports letters, numbers, spaces, and special characters: - ' . , #
- `suburb`: Supports letters, numbers, spaces, and characters: - ' .
- `state`: Must be a valid Australian state or territory code
- `postcode`: Must be exactly 4 digits
- `country`: Supports letters, numbers, spaces, and characters: - '

**Response (201 Created):**
```json
{
  "message": "Address created successfully",
  "addressId": "550e8400-e29b-41d4-a716-446655440000",
  "address": {
    "userId": "user123",
    "addressId": "550e8400-e29b-41d4-a716-446655440000",
    "street": "123 Main Street",
    "suburb": "Sydney",
    "state": "NSW",
    "postcode": "2000",
    "country": "Australia",
    "addressType": "residential",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - Missing required fields:
```json
{
  "message": "Validation failed",
  "error": "\"street\" is required"
}
```

**401 Unauthorized** - Invalid credentials:
```json
{
  "message": "Unauthorized"
}
```

**409 Conflict** - Duplicate address already exists:
```json
{
  "message": "An identical address already exists for this user",
  "error": "DUPLICATE_ADDRESS"
}
```
**Note:** The duplicate check compares `streetAddress`, `suburb`, `state`, `postcode`, `country`, and `addressType` fields. Comparisons are case-insensitive and trimmed. Duplicates are detected per user (userId), so different users can have the same address.

**500 Internal Server Error** - Server error:
```json
{
  "message": "Internal server error"
}
```

**Example Request (cURL):**
```bash
curl -X POST https://api.../dev/v1/users/user123/addresses \
  -u "clientId:clientSecret" \
  -H "Content-Type: application/json" \
  -d '{
    "street": "123 Main Street",
    "suburb": "Sydney",
    "state": "NSW",
    "postcode": "2000",
    "addressType": "residential"
  }'
```

---

### 2. Get Addresses

Retrieves all addresses for a user with optional filtering.

**Request:**
```http
GET /v1/users/{userId}/addresses?suburb=Sydney&postcode=2000
Authorization: Basic <base64(clientId:clientSecret)>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | Unique user identifier (1-128 characters, alphanumeric, hyphens, underscores only) |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| suburb | string | No | Filter by suburb name |
| postcode | string | No | Filter by postal code |

**Response (200 OK):**
```json
{
  "message": "Addresses retrieved successfully",
  "addresses": [
    {
      "userId": "user123",
      "addressId": "550e8400-e29b-41d4-a716-446655440000",
      "streetAddress": "123 Main Street",
      "suburb": "Sydney",
      "state": "NSW",
      "postcode": "2000",
      "country": "Australia",
      "addressType": "residential",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "userId": "user123",
      "addressId": "660f9501-f30c-52e5-b827-557766551111",
      "streetAddress": "456 Business Ave",
      "suburb": "Sydney",
      "state": "NSW",
      "postcode": "2001",
      "country": "Australia",
      "addressType": "billing",
      "createdAt": "2024-01-16T14:22:00.000Z",
      "updatedAt": "2024-01-16T14:22:00.000Z"
    }
  ]
}
```

**Error Responses:**

**401 Unauthorized** - Invalid credentials:
```json
{
  "message": "Unauthorized"
}
```

**400 Bad Request** - Missing userId:
```json
{
  "message": "Missing userId"
}
```

**Example Requests (cURL):**
```bash
# Get all addresses for a user
curl -X GET https://api.../dev/v1/users/user123/addresses \
  -u "clientId:clientSecret"

# Get addresses filtered by suburb
curl -X GET "https://api.../dev/v1/users/user123/addresses?suburb=Sydney" \
  -u "clientId:clientSecret"

# Get addresses filtered by postcode
curl -X GET "https://api.../dev/v1/users/user123/addresses?postcode=2000" \
  -u "clientId:clientSecret"

# Get addresses filtered by both suburb and postcode
curl -X GET "https://api.../dev/v1/users/user123/addresses?suburb=Sydney&postcode=2000" \
  -u "clientId:clientSecret"
```

---

### 3. Update Address

Updates one or more fields of an existing address.

**Request:**
```http
PATCH /v1/users/{userId}/addresses/{addressId}
Authorization: Basic <base64(clientId:clientSecret)>
Content-Type: application/json
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | Unique user identifier (1-128 characters, alphanumeric, hyphens, underscores only) |
| addressId | string | Yes | Address ID to update (UUID format - supports v1, v3, v4, v5) |

**Request Body:** (all fields optional - include only fields to update)
```json
{
  "streetAddress": "789 Updated Street",
  "suburb": "Melbourne",
  "state": "VIC",
  "postcode": "3000",
  "country": "Australia",
  "addressType": "billing"
}
```

**Response (200 OK):**
```json
{
  "message": "Address updated successfully",
  "addressId": "550e8400-e29b-41d4-a716-446655440000",
  "address": {
    "userId": "user123",
    "addressId": "550e8400-e29b-41d4-a716-446655440000",
    "streetAddress": "789 Updated Street",
    "suburb": "Melbourne",
    "state": "VIC",
    "postcode": "3000",
    "country": "Australia",
    "addressType": "billing",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-17T15:45:00.000Z"
  }
}
```

**Validation Rules (same as Create):**
- `streetAddress`: Supports letters, numbers, spaces, and special characters: - ' . , #
- `suburb`: Supports letters, numbers, spaces, and characters: - ' .
- `state`: Must be a valid Australian state or territory code (NSW, VIC, QLD, WA, SA, TAS, ACT, NT)
- `postcode`: Must be exactly 4 digits
- `country`: Supports letters, numbers, spaces, and characters: - '

**Error Responses:**

**400 Bad Request** - No fields to update:
```json
{
  "message": "No fields to update"
}
```

**400 Bad Request** - Invalid state code:
```json
{
  "message": "state must be a valid Australian state code (NSW, VIC, QLD, WA, SA, TAS, ACT, NT)"
}
```

**401 Unauthorized** - Invalid credentials:
```json
{
  "message": "Unauthorized"
}
```

**400 Bad Request** - Missing userId/addressId:
```json
{
  "message": "Missing userId or addressId"
}
```

**Example Request (cURL):**
```bash
curl -X PATCH https://api.../dev/v1/users/user123/addresses/550e8400-e29b-41d4-a716-446655440000 \
  -u "clientId:clientSecret" \
  -H "Content-Type: application/json" \
  -d '{
    "suburb": "Melbourne",
    "state": "VIC",
    "addressType": "billing"
  }'
```

---

### 4. Delete Address

Deletes an address.

**Request:**
```http
DELETE /v1/users/{userId}/addresses/{addressId}
Authorization: Basic <base64(clientId:clientSecret)>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | Unique user identifier (1-128 characters, alphanumeric, hyphens, underscores only) |
| addressId | string | Yes | Address ID to delete (UUID format - supports v1, v3, v4, v5) |

**Response (204 No Content):**
- No response body
- Status code: 204

**Error Responses:**

**401 Unauthorized** - Invalid credentials:
```json
{
  "message": "Unauthorized"
}
```

**400 Bad Request** - Invalid userId format:
```json
{
  "message": "Invalid userId format. Must be 1-128 characters with only alphanumeric characters, hyphens (-), and underscores (_)."
}
```

**400 Bad Request** - Invalid addressId format:
```json
{
  "message": "Invalid addressId format. Must be a valid UUID (v1, v3, v4, or v5)."
}
```

**Example Request (cURL):**
```bash
curl -X DELETE https://api.../dev/v1/users/user_123/addresses/550e8400-e29b-41d4-a716-446655440000 \
  -u "clientId:clientSecret"
```

---

## Common Patterns

### Creating an Address and Getting It

```bash
#!/bin/bash
API_ENDPOINT="https://api.../dev/v1"
AUTH="-u clientId:clientSecret"

# 1. Create address
RESPONSE=$(curl -X POST $API_ENDPOINT/users/user123/addresses $AUTH \
  -H "Content-Type: application/json" \
  -d '{
    "street": "123 Main St",
    "suburb": "Sydney",
    "state": "NSW",
    "postcode": "2000",
    "addressType": "residential"
  }')

ADDRESS_ID=$(echo $RESPONSE | jq -r '.addressId')
echo "Created address: $ADDRESS_ID"

# 2. Get the address
curl -X GET "$API_ENDPOINT/users/user123/addresses?suburb=Sydney" $AUTH | jq .
```

### Updating Multiple Fields

```bash
curl -X PATCH https://api.../dev/v1/users/user123/addresses/address-id \
  -u "clientId:clientSecret" \
  -H "Content-Type: application/json" \
  -d '{
    "street": "456 New Street",
    "suburb": "Melbourne",
    "postcode": "3000"
  }'
```

### Handling Errors

```javascript
async function createAddress(userId, addressData) {
  try {
    const response = await fetch(
      `https://api.../dev/v1/users/${userId}/addresses`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addressData)
      }
    );

    if (response.status === 400) {
      const error = await response.json();
      console.error('Validation error:', error.message);
      return null;
    }

    if (response.status === 401) {
      console.error('Unauthorized - check credentials');
      return null;
    }

    if (response.status === 201) {
      return await response.json();
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}
```

## Status Codes Reference

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Resource deleted successfully |
| 400 | Bad Request | Invalid request or validation error |
| 401 | Unauthorized | Authentication failed or missing |
| 500 | Internal Server Error | Server error |

## Rate Limiting

Requests are rate limited per client:

**Headers:**
- `X-RateLimit-Limit`: Maximum requests per minute
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

**Limits:**
- Dev: 500 requests/minute
- Prod: 1000 requests/minute

## Best Practices

1. **Always use HTTPS** - Never use HTTP
2. **Include proper headers** - Always include `Authorization` and `Content-Type`
3. **Handle errors gracefully** - Implement retry logic with exponential backoff
4. **Validate input** - Check data before sending
5. **Use appropriate HTTP methods** - GET for retrieval, POST for creation, PATCH for updates, DELETE for deletion
6. **Test with cURL first** - Validate requests before implementing in code
7. **Monitor rate limits** - Check `X-RateLimit-*` headers and implement throttling
