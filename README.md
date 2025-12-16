# Serverless User Address API

AWS CDK-based serverless API for managing user addresses with CRUD operations.

## Features

- RESTful API for address management (Create, Read, Update, Delete)
- AWS Lambda serverless functions
- DynamoDB for persistent storage
- KMS encryption at rest
- API Gateway with custom authorizer
- HTTP Basic Auth (SHA-256)
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

## License

MIT
