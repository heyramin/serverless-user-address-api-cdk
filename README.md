# Serverless User Address API

AWS CDK-based serverless API for managing user addresses with CRUD operations.

## Features

- RESTful API for address management (Create, Read, Update, Delete)
- AWS Lambda serverless functions
- DynamoDB for persistent storage
- KMS encryption at rest
- API Gateway with custom authorizer
- HTTP Basic Auth (SHA-256)
- Duplicate address prevention (per-user, case-insensitive comparison)
- Rate limiting and usage plans
- Comprehensive testing (unit + integration)
- Infrastructure as Code (AWS CDK)

## Tech Stack

- **Framework**: AWS CDK 2.x (TypeScript)
- **Runtime**: Node.js 18.x
- **Database**: Amazon DynamoDB
- **API Gateway**: REST API with Custom Authorizer
- **Encryption**: AWS KMS (customer-managed keys)
- **Testing**: Jest (unit + integration tests)
- **CI/CD**: GitHub Actions
- **Code Quality**: ESLint, Prettier

## Getting Started

### Prerequisites

- Node.js 18.x or later
- AWS CLI configured with credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

### Installation

```bash
npm install
```

### Building

```bash
npm run build
```

### Deployment

```bash
# Deploy to dev environment
npm run cdk:deploy:dev

# Deploy to prod environment
npm run cdk:deploy:prod
```

## API Endpoints

### Create Address
```
POST /v1/users/{userId}/addresses
```

### Retrieve Addresses
```
GET /v1/users/{userId}/addresses?suburb=...&postcode=...
```

### Update Address
```
PATCH /v1/users/{userId}/addresses/{addressId}
```

### Delete Address
```
DELETE /v1/users/{userId}/addresses/{addressId}
```

## Duplicate Address Prevention

The API automatically prevents users from creating duplicate addresses within their account:

- **Per-User Validation**: Each user can only have one address with a specific combination of details
- **Case-Insensitive Comparison**: Addresses are compared after normalizing to lowercase (e.g., "123 Main St" matches "123 main st")
- **Whitespace Handling**: Whitespace is trimmed during schema validation before comparison
- **Compared Fields**: `streetAddress`, `suburb`, `state`, `postcode`, `country`, `addressType`
- **Error Response**: Returns HTTP 409 Conflict when a duplicate is detected with error code `DUPLICATE_ADDRESS`
- **Cross-User Addresses**: Different users can have identical addresses without conflict

### Example Duplicate Response
```json
{
  "message": "An identical address already exists for this user",
  "error": "DUPLICATE_ADDRESS"
}
```

For more details on error responses, see [API_REFERENCE.md](docs/API_REFERENCE.md).

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests only
npm run test:integration
```

## Authentication

All endpoints require HTTP Basic Auth using SHA-256 hashed credentials.

For detailed authentication implementation and examples, see [CLIENT_AUTHENTICATION.md](docs/CLIENT_AUTHENTICATION.md).

## Documentation

Comprehensive documentation is available in the `/docs` folder:

| Document | Purpose | Audience |
|----------|---------|----------|
| [API_REFERENCE.md](docs/API_REFERENCE.md) | Complete API endpoint documentation with request/response examples for all operations | API consumers, integrators |
| [CLIENT_AUTHENTICATION.md](docs/CLIENT_AUTHENTICATION.md) | HTTP Basic Auth implementation details, code examples in JavaScript/Python/cURL, best practices | Developers implementing authentication |
| [INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md) | Architecture diagrams, database schemas, Lambda specifications, security model, monitoring setup | DevOps, infrastructure engineers |
| [TESTING_GUIDE.md](docs/TESTING_GUIDE.md) | Unit test structure, integration test patterns, running tests locally, mocking DynamoDB | Test engineers, developers |
| [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Step-by-step deployment instructions, pre/post-deployment verification, environment-specific configs | DevOps, release managers |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Solutions for common issues, authentication errors, validation errors, performance troubleshooting | All users, support team |

### Quick Links

**For Users:**
- 🔐 Authentication: [CLIENT_AUTHENTICATION.md](docs/CLIENT_AUTHENTICATION.md)
- 📡 API Endpoints: [API_REFERENCE.md](docs/API_REFERENCE.md)
- ❓ Common Issues: [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

**For Developers:**
- 🏗️ Architecture: [INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md)
- ✅ Testing: [TESTING_GUIDE.md](docs/TESTING_GUIDE.md)

**For DevOps:**
- 🚀 Deployment: [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)
- 📊 Infrastructure: [INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md)

## Quick Start

### 1. Get API Credentials

```bash
curl -X POST https://YOUR_API_ENDPOINT/init-client \
  -H "Content-Type: application/json" \
  -d '{"clientId": "test-client", "clientSecret": "test-secret"}'
```

### 2. Create Your First Address

```bash
# Set up variables
API_ENDPOINT="https://YOUR_API_ENDPOINT"
CLIENT_ID="test-client"
CLIENT_SECRET="test-secret"
CREDENTIALS=$(echo -n "$CLIENT_ID:$CLIENT_SECRET" | base64)

# Create address
curl -X POST "$API_ENDPOINT/v1/users/user123/addresses" \
  -H "Authorization: Basic $CREDENTIALS" \
  -H "Content-Type: application/json" \
  -d '{
    "streetAddress": "123 Main Street",
    "suburb": "Sydney",
    "state": "NSW",
    "postcode": "2000",
    "addressType": "residential"
  }'
```

### 3. Retrieve Your Addresses

```bash
curl -X GET "$API_ENDPOINT/v1/users/user123/addresses" \
  -H "Authorization: Basic $CREDENTIALS"
```

For more examples and detailed API documentation, see [API_REFERENCE.md](docs/API_REFERENCE.md).

## Project Structure

```
serverless-user-address-api-cdk/
├── docs/                          # Comprehensive documentation
│   ├── API_REFERENCE.md          # API endpoints and examples
│   ├── CLIENT_AUTHENTICATION.md   # Authentication guide
│   ├── INFRASTRUCTURE.md          # Architecture and infrastructure
│   ├── TESTING_GUIDE.md           # Testing patterns and examples
│   ├── DEPLOYMENT_GUIDE.md        # Deployment procedures
│   └── TROUBLESHOOTING.md         # Common issues and solutions
├── src/
│   ├── handlers/                  # Lambda function handlers
│   │   ├── store-address.ts       # Create address
│   │   ├── get-addresses.ts       # Retrieve addresses
│   │   ├── update-address.ts      # Update address
│   │   ├── delete-address.ts      # Delete address
│   │   ├── authorize.ts           # API authorizer
│   │   └── init-client.ts         # Initialize test credentials
│   └── interfaces/                # TypeScript interfaces
├── lib/
│   └── user-address-api-stack.ts  # CDK stack definition
├── tests/
│   ├── unit/                      # Unit tests for handlers
│   └── integration/               # Integration tests
├── openapi.yaml                   # OpenAPI specification
├── package.json                   # Project dependencies
├── tsconfig.json                  # TypeScript configuration
├── webpack.config.js              # Webpack bundling config
└── cdk.json                        # CDK configuration
```

## Development

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage
```

### Local Development

```bash
# Start Docker services (MongoDB for integration tests)
docker-compose up

# In another terminal, run tests
npm test
```

See [TESTING_GUIDE.md](docs/TESTING_GUIDE.md) for detailed testing instructions.

## Deployment

### Prerequisites

- AWS account with appropriate permissions
- AWS CLI configured
- AWS CDK CLI installed

### Deploy to Dev

```bash
npm run build
npx cdk deploy --context env=dev
```

### Deploy to Prod

```bash
npm run build
npx cdk deploy --context env=prod --require-approval always
```

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md).

## Monitoring

Monitor your API using CloudWatch:

```bash
# View Lambda logs
aws logs tail /aws/lambda/UserAddressApiStack \
  --follow \
  --region ap-southeast-2

# View API metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --region ap-southeast-2
```

See [INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md) for detailed monitoring setup.

## Support

For common issues and solutions, see [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

For detailed architecture and infrastructure questions, see [INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md).

## License

MIT
