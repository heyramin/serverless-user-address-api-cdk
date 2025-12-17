# Deployment Guide

## Overview

This guide covers deploying the User Address API to AWS using AWS CDK. The API runs on AWS Lambda with a REST API on API Gateway, backed by DynamoDB.

## Prerequisites

Before deploying, ensure you have:

1. **AWS Account** - Active AWS account with appropriate permissions
2. **AWS CLI** - Installed and configured (`aws configure`)
3. **Node.js 18+** - Required for Lambda runtime and CDK
4. **npm** - Package manager
5. **Docker** - For local testing (optional but recommended)
6. **Git** - For version control

### AWS Permissions Required

Your AWS IAM user needs permissions for:
- Lambda (create, update, delete functions)
- API Gateway (create, update APIs)
- DynamoDB (create, update tables)
- IAM (create roles and policies)
- CloudFormation (deploy stacks)
- CloudWatch (view logs)
- KMS (manage encryption keys)
- S3 (store CDK assets)

### Minimal IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:*",
        "apigateway:*",
        "dynamodb:*",
        "iam:*",
        "cloudformation:*",
        "cloudwatch:*",
        "kms:*",
        "s3:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## Environment Setup

### 1. Install Dependencies

```bash
cd mnr/copy
npm install
```

### 2. Configure AWS Credentials

```bash
# Option 1: Using AWS CLI
aws configure

# Enter:
# AWS Access Key ID
# AWS Secret Access Key
# Default region: ap-southeast-2
# Default output format: json
```

```bash
# Option 2: Using environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="ap-southeast-2"
```

### 3. Set Deployment Variables

Create a `.env` file in the project root (or set as environment variables):

```bash
# Deployment environment (dev or prod)
DEPLOYMENT_ENV=dev

# AWS Configuration
AWS_REGION=ap-southeast-2
AWS_ACCOUNT_ID=123456789012

# API Configuration
STAGE_NAME=dev
API_CORS_ORIGIN=https://example.com  # Update for your frontend domain
```

## Deployment Steps

### Step 1: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript and runs all tests. Ensure all tests pass.

**Output:**
```
✓ TypeScript compilation successful
✓ All tests passed (28/28)
✓ Code ready for deployment
```

### Step 2: Bootstrap AWS CDK

Run this once per AWS account/region:

```bash
npx cdk bootstrap aws://ACCOUNT_ID/REGION
```

Example:
```bash
npx cdk bootstrap aws://123456789012/ap-southeast-2
```

This creates:
- S3 bucket for CDK assets
- IAM roles for CDK execution
- CloudFormation stack

### Step 3: Synthesize CDK Stack

Generate the CloudFormation template:

```bash
npx cdk synth
```

This creates `cdk.out/` directory with CloudFormation templates.

### Step 4: Review Changes

Preview what CDK will deploy:

```bash
npx cdk diff
```

This shows:
- New resources to create
- Existing resources to modify
- Resources to delete

**Example output:**
```
Stack UserAddressApiStack
[+] AWS::Lambda::Function StoreAddressFunction
[+] AWS::Lambda::Function GetAddressesFunction
[+] AWS::Lambda::Function UpdateAddressFunction
[+] AWS::Lambda::Function DeleteAddressFunction
[+] AWS::Lambda::Function AuthorizeFunction
[+] AWS::Lambda::Function InitClientFunction
[+] AWS::ApiGateway::RestApi UserAddressApi
[+] AWS::DynamoDB::Table AddressesTable
[+] AWS::KMS::Key EncryptionKey
[~] AWS::IAM::Role LambdaExecutionRole
```

### Step 5: Deploy to AWS

Deploy the stack:

```bash
npx cdk deploy
```

**For development environment:**
```bash
DEPLOYMENT_ENV=dev npx cdk deploy
```

**For production environment:**
```bash
DEPLOYMENT_ENV=prod npx cdk deploy
```

During deployment, you'll be prompted:

```
Do you wish to deploy these changes (y/n)?
```

Enter `y` to proceed.

**Deployment takes 5-10 minutes.** Wait for completion message:

```
UserAddressApiStack: creation successful
Outputs:
UserAddressApiEndpoint = https://abc123.execute-api.ap-southeast-2.amazonaws.com/dev/v1
```

### Step 6: Verify Deployment

#### Check CloudFormation Stack
```bash
aws cloudformation describe-stacks \
  --stack-name UserAddressApiStack \
  --region ap-southeast-2
```

#### List Lambda Functions
```bash
aws lambda list-functions \
  --region ap-southeast-2 \
  --query 'Functions[?starts_with(FunctionName, `UserAddressApi`)].FunctionName'
```

#### Check DynamoDB Table
```bash
aws dynamodb describe-table \
  --table-name addresses \
  --region ap-southeast-2
```

#### Get API Gateway Endpoint
```bash
aws apigateway get-rest-apis \
  --region ap-southeast-2 \
  --query 'items[0].{id:id,name:name}'
```

## Post-Deployment Verification

### 1. Initialize Test Credentials

```bash
curl -X POST https://YOUR_API_ENDPOINT/init-client \
  -H "Content-Type: application/json" \
  -d '{"clientId": "test-client", "clientSecret": "test-secret"}'
```

Response:
```json
{
  "message": "Client initialized successfully",
  "credentials": {
    "clientId": "test-client",
    "clientSecret": "test-secret"
  }
}
```

### 2. Test Create Address

```bash
ENDPOINT="https://YOUR_API_ENDPOINT"
CLIENT_ID="test-client"
CLIENT_SECRET="test-secret"
CREDENTIALS=$(echo -n "$CLIENT_ID:$CLIENT_SECRET" | base64)

curl -X POST $ENDPOINT/v1/users/test-user/addresses \
  -H "Authorization: Basic $CREDENTIALS" \
  -H "Content-Type: application/json" \
  -d '{
    "street": "123 Test Street",
    "suburb": "Sydney",
    "state": "NSW",
    "postcode": "2000",
    "addressType": "residential"
  }'
```

Expected response: `201 Created`

### 3. Test Get Addresses

```bash
curl -X GET "$ENDPOINT/v1/users/test-user/addresses" \
  -H "Authorization: Basic $CREDENTIALS"
```

Expected response: `200 OK` with address list

### 4. View CloudWatch Logs

```bash
# View logs from a specific Lambda function
aws logs tail /aws/lambda/UserAddressApiStack-StoreAddressFunction \
  --follow \
  --region ap-southeast-2
```

### 5. Check API Gateway Metrics

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --region ap-southeast-2
```

## Environment-Specific Deployment

### Development Deployment

```bash
DEPLOYMENT_ENV=dev npx cdk deploy \
  --require-approval never
```

Creates:
- API stage: `/dev/v1`
- DynamoDB: pay-per-request (development billing)
- CloudWatch: Standard retention
- Logging: Verbose

### Production Deployment

```bash
DEPLOYMENT_ENV=prod npx cdk deploy \
  --require-approval always
```

Creates:
- API stage: `/prod/v1`
- DynamoDB: provisioned capacity (if configured)
- CloudWatch: Extended retention
- Logging: Standard level
- Backup: Enabled

## Updating After Deployment

### Update Lambda Function Code

After making code changes:

```bash
npm run build
npx cdk deploy
```

CDK automatically:
1. Repackages Lambda code
2. Uploads to S3
3. Updates Lambda functions
4. No downtime for changes

### Update API Configuration

Changes to API Gateway configuration (CORS, rate limits, etc.):

```bash
# Review changes
npx cdk diff

# Deploy
npx cdk deploy
```

### Update DynamoDB Settings

Changes to DynamoDB table (capacity, TTL, etc.):

```bash
npx cdk deploy
```

## Rollback Procedures

### Rollback to Previous Stack

If deployment fails or causes issues:

```bash
# List stack change sets
aws cloudformation list-change-sets \
  --stack-name UserAddressApiStack \
  --region ap-southeast-2

# Rollback to previous version
aws cloudformation cancel-update-stack \
  --stack-name UserAddressApiStack \
  --region ap-southeast-2
```

### Manual Rollback

If automatic rollback fails:

```bash
# Delete current stack
aws cloudformation delete-stack \
  --stack-name UserAddressApiStack \
  --region ap-southeast-2

# Redeploy previous version
git checkout PREVIOUS_COMMIT_HASH
npm run build
npx cdk deploy
```

## Monitoring Post-Deployment

### View API Metrics

```bash
# Count API requests
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=UserAddressApi \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --region ap-southeast-2

# View error rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name 4XXError \
  --dimensions Name=ApiName,Value=UserAddressApi \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --region ap-southeast-2
```

### View Lambda Metrics

```bash
# Lambda invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=UserAddressApiStack-StoreAddressFunction \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --region ap-southeast-2

# Lambda errors
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=UserAddressApiStack-StoreAddressFunction \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --region ap-southeast-2
```

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests passing (`npm test`)
- [ ] Code reviewed and merged to main branch
- [ ] Build successful (`npm run build`)
- [ ] Environment variables configured correctly
- [ ] AWS credentials validated
- [ ] Backup of current production stack exists
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Monitoring configured
- [ ] CORS domains updated
- [ ] Database capacity planned
- [ ] KMS key retention policy verified

## Troubleshooting Deployment

### CDK Bootstrap Fails

**Error:** `AccessDenied: User is not authorized to perform: iam:CreateRole`

**Solution:** Ensure your AWS user has IAM permissions.

### Deployment Timeout

**Error:** `Stack is in CREATE_IN_PROGRESS state for more than 1 hour`

**Solution:** Check CloudFormation events for specific failure, then redeploy.

### Lambda Function Not Updating

**Error:** Old code still running after deployment

**Solution:**
```bash
# Clear CDK cache
rm -rf cdk.out/
npm run build
npx cdk deploy
```

### DynamoDB Capacity Exceeded

**Error:** `ProvisionedThroughputExceededException`

**Solution:** Check deployment config, increase capacity or switch to on-demand billing.

### API Gateway CORS Errors

**Error:** `No 'Access-Control-Allow-Origin' header`

**Solution:** Update CORS_ORIGIN in environment variables and redeploy.

## Cleanup

To delete the entire stack and all resources:

```bash
npx cdk destroy
```

**Warning:** This will:
- Delete all Lambda functions
- Delete API Gateway
- Delete DynamoDB table (with data)
- Delete KMS keys
- Delete CloudWatch log groups

Confirm when prompted:

```
Are you sure you want to delete: UserAddressApiStack (y/n)?
```

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [CloudFormation User Guide](https://docs.aws.amazon.com/cloudformation/)
