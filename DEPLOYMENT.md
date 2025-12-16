# Deployment Guide

This guide covers deploying the Serverless User Address API to AWS.

## Prerequisites

- AWS Account with appropriate permissions
- Node.js 18.x or later
- AWS CLI configured with credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

## Deployment Steps

### 1. Initial Setup

```bash
# Install dependencies
npm install

# Configure AWS credentials
aws configure

# Build the project
npm run build
```

### 2. Bootstrap (First Time Only)

Bootstrap CDK in your AWS account:

```bash
# For dev environment
npm run cdk:deploy:dev -- --context environment=dev

# For prod environment
npm run cdk:deploy:prod -- --context environment=prod
```

Or use GitHub Actions:

1. Go to **Actions** → **Bootstrap CDK**
2. Click **Run workflow**

### 3. Deploy Stack

**Via CLI:**

```bash
# Deploy to dev
npm run cdk:deploy:dev

# Deploy to prod
npm run cdk:deploy:prod
```

**Via GitHub Actions:**

1. Push code to `develop` branch (triggers dev deployment)
2. Push code to `main` branch or create a tag (triggers prod deployment)

### 4. Create API Client Credentials

After deployment, create credentials for API access:

```bash
aws lambda invoke \
  --function-name UserAddressApiStack-dev-InitClientFunction-<SUFFIX> \
  --payload '{"clientName":"My App","description":"My application"}' \
  --region ap-southeast-2 \
  response.json

cat response.json
```

The response will contain:
- `clientId`: Unique identifier
- `clientSecret`: Plain text secret (save immediately!)
- Usage instructions

### 5. Test the API

```bash
# Get API endpoint from CloudFormation outputs
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name UserAddressApiStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text \
  --region ap-southeast-2)

# Create an address
curl -X POST $API_ENDPOINT/users/user123/addresses \
  -H "Authorization: Basic $(echo -n 'clientId:clientSecret' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "street": "123 Main St",
    "suburb": "Sydney",
    "state": "NSW",
    "postcode": "2000",
    "addressType": "residential"
  }'

# Retrieve addresses
curl -X GET "$API_ENDPOINT/users/user123/addresses" \
  -H "Authorization: Basic $(echo -n 'clientId:clientSecret' | base64)"
```

### 6. Run Tests

```bash
# Unit tests
npm test

# Integration tests (requires deployed API)
npm run test:integration
```

## Environment Configuration

Configure environment variables in `.env.dev` or `.env.prod`:

```bash
AWS_REGION=ap-southeast-2
ENVIRONMENT=dev
NODE_ENV=development
```

## CloudFormation Outputs

After deployment, outputs are displayed:

```
ApiEndpoint: https://xxxxx.execute-api.ap-southeast-2.amazonaws.com/v1
TableName: user-addresses-dev
InitClientFunctionName: UserAddressApiStack-dev-InitClientFunction-xxxxx
```

## Monitoring & Logs

View Lambda logs:

```bash
aws logs tail /aws/lambda/UserAddressApiStack-dev-StoreAddressFunction --follow --region ap-southeast-2
```

View API Gateway logs:

```bash
aws logs tail /aws/apigateway/UserAddressApiStack-dev --follow --region ap-southeast-2
```

## Troubleshooting

### Stack Creation Failed

Check CloudFormation events:

```bash
aws cloudformation describe-stack-events \
  --stack-name UserAddressApiStack-dev \
  --region ap-southeast-2
```

### Lambda Function Errors

Check function logs:

```bash
aws logs tail /aws/lambda/<FUNCTION_NAME> --follow --region ap-southeast-2
```

### DynamoDB Issues

List tables:

```bash
aws dynamodb list-tables --region ap-southeast-2
```

Describe table:

```bash
aws dynamodb describe-table \
  --table-name user-addresses-dev \
  --region ap-southeast-2
```

### API Gateway 403 Errors

Verify Lambda execution role has correct permissions:

```bash
aws iam list-role-policies --role-name <ROLE_NAME> --region ap-southeast-2
```

## Cost Estimation

Estimated monthly costs (dev environment, low usage):

- **API Gateway**: $3.50 (1M requests)
- **Lambda**: $0.20 (1M requests, 512MB)
- **DynamoDB**: $1.25 (on-demand pricing)
- **KMS**: $1.00 (key storage)
- **CloudWatch Logs**: $0.50

**Total**: ~$6.45/month

## Production Considerations

For production deployments:

1. **Enable API Gateway caching** for better performance
2. **Set up CloudWatch alarms** for errors
3. **Enable X-Ray tracing** for debugging
4. **Use separate AWS accounts** for dev/prod
5. **Implement API rate limiting** (configured: 1000 req/s)
6. **Enable S3 access logs** if using S3 for Lambda code
7. **Set up automated backups** for DynamoDB
8. **Use AWS Secrets Manager** for credential rotation

See [DESTROY.md](./DESTROY.md) for cleanup instructions.
