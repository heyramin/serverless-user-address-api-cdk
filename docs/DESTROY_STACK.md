# Destroying the Stack

When you need to tear down the AWS infrastructure, follow these steps:

## Option 1: Using GitHub Actions (Recommended)

1. Go to the repository on GitHub
2. Navigate to **Actions** tab
3. Select **Destroy Stack** workflow
4. Click **Run workflow**
5. Choose the environment (dev or prod)
6. Confirm destruction

## Option 2: Using AWS CLI

```bash
# Destroy dev environment
npx cdk destroy --context environment=dev --force

# Destroy prod environment
npx cdk destroy --context environment=prod --force
```

## What Gets Destroyed

- ✅ API Gateway (REST API)
- ✅ Lambda Functions (all 5 handlers)
- ✅ DynamoDB Tables (addresses + clients)
- ✅ KMS Key
- ✅ CloudWatch Logs
- ✅ IAM Roles & Policies

## What Persists

- 📌 CloudFormation Stack history (for audit purposes)
- 📌 CloudTrail logs (if enabled)

## Backup Before Destroying

If you have important data, export DynamoDB items before destruction:

```bash
aws dynamodb scan \
  --table-name user-addresses-dev \
  --region ap-southeast-2 \
  > addresses-backup.json
```

## Confirm Destruction Completed

```bash
aws cloudformation describe-stacks \
  --stack-name UserAddressApiStack-dev \
  --region ap-southeast-2
```

Should return an error if stack is successfully deleted.

## Re-Deploy After Destruction

To re-deploy the stack after destruction:

```bash
npm run cdk:bootstrap:dev
npm run cdk:deploy:dev
```

## Costs After Destruction

Once the stack is destroyed, no AWS charges will incur for:
- API Gateway requests
- Lambda invocations
- DynamoDB storage/requests
- KMS key usage

⚠️ **Note**: A destroyed stack cannot be recovered. Ensure you have backups of any critical data.
