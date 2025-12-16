import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

interface UserAddressApiStackProps extends cdk.StackProps {
  environment: 'dev' | 'prod';
}

export class UserAddressApiStack extends cdk.Stack {
  private table: dynamodb.Table;
  private clientsTable: dynamodb.Table;
  private kmsKey: kms.Key;
  private api: apigateway.RestApi;
  private authorizer: apigateway.TokenAuthorizer;

  constructor(scope: Construct, id: string, props: UserAddressApiStackProps) {
    super(scope, id, props);

    const env = props.environment;

    // Create KMS key for encryption (shared by all DynamoDB tables in this stack)
    this.kmsKey = new kms.Key(this, 'AddressesTableKey', {
      description: 'KMS key for DynamoDB encryption',
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pendingWindow: cdk.Duration.days(7), // 7-day waiting period for key deletion
    });

    // Add alias for easier identification (reflects shared use across multiple tables)
    this.kmsKey.addAlias(`alias/user-address-api-${env}`);

    // Create DynamoDB table for addresses
    this.table = new dynamodb.Table(this, 'AddressesTable', {
      tableName: `user-addresses-${env}`,
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'addressId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: this.kmsKey,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for suburb/postcode filtering
    this.table.addGlobalSecondaryIndex({
      indexName: 'suburbIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'suburb',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Create DynamoDB table for API clients
    this.clientsTable = new dynamodb.Table(this, 'ClientsTable', {
      tableName: `user-address-clients-${env}`,
      partitionKey: {
        name: 'clientId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: this.kmsKey,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create REST API
    this.api = new apigateway.RestApi(this, 'UserAddressApi', {
      restApiName: `user-address-api-${env}`,
      description: 'User Address API',
      cloudWatchRole: true,
      deployOptions: {
        stageName: 'v1',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });

    // Create authorizer Lambda
    const authorizerFunction = this.createAuthorizerFunction(env);
    this.authorizer = new apigateway.TokenAuthorizer(this, 'ClientAuthorizer-v2', {
      handler: authorizerFunction,
      resultsCacheTtl: cdk.Duration.seconds(0),
      identitySource: 'method.request.header.Authorization',
    });

    // Create Lambda functions
    const storeAddressFunction = this.createStoreAddressFunction(env);
    const getAddressesFunction = this.createGetAddressesFunction(env);
    const updateAddressFunction = this.createUpdateAddressFunction(env);
    const deleteAddressFunction = this.createDeleteAddressFunction(env);
    const initClientFunction = this.createInitClientFunction(env);

    // Create API endpoints
    const usersResource = this.api.root.addResource('users');
    const userIdResource = usersResource.addResource('{userId}');
    const addressesResource = userIdResource.addResource('addresses');
    const addressIdResource = addressesResource.addResource('{addressId}');

    // POST /users/{id}/addresses
    addressesResource.addMethod('POST', new apigateway.LambdaIntegration(storeAddressFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // GET /users/{id}/addresses
    addressesResource.addMethod('GET', new apigateway.LambdaIntegration(getAddressesFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // PATCH /users/{id}/addresses/{addressId}
    addressIdResource.addMethod('PATCH', new apigateway.LambdaIntegration(updateAddressFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // DELETE /users/{id}/addresses/{addressId}
    addressIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteAddressFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Create usage plan and API key
    const usagePlan = this.api.addUsagePlan('UsagePlan', {
      name: `user-address-api-plan-${env}`,
      throttle: {
        rateLimit: env === 'prod' ? 1000 : 500,
        burstLimit: env === 'prod' ? 2000 : 1000,
      },
    });

    const apiKey = this.api.addApiKey('ApiKey', {
      apiKeyName: `user-address-api-key-${env}`,
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: this.api.deploymentStage,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'User Address API endpoint',
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB table name',
    });

    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: apiKey.keyId,
      description: 'API Key ID',
    });

    new cdk.CfnOutput(this, 'InitClientFunctionName', {
      value: initClientFunction.functionName,
      description: 'Init Client Lambda function name',
    });
  }

  private createAuthorizerFunction(env: string): lambda.Function {
    const fn = new lambda.Function(this, 'AuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'authorize.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/handlers')),
      timeout: cdk.Duration.seconds(30),
      environment: {
        CLIENTS_TABLE: `user-address-clients-${env}`,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant access to clients table
    this.clientsTable.grantReadData(fn);

    return fn;
  }

  private createStoreAddressFunction(env: string): lambda.Function {
    const fn = new lambda.Function(this, 'StoreAddressFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'store-address.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/handlers')),
      timeout: cdk.Duration.seconds(30),
      environment: {
        ADDRESSES_TABLE: this.table.tableName,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    this.table.grantReadWriteData(fn);
    this.kmsKey.grantEncryptDecrypt(fn);

    return fn;
  }

  private createGetAddressesFunction(env: string): lambda.Function {
    const fn = new lambda.Function(this, 'GetAddressesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'get-addresses.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/handlers')),
      timeout: cdk.Duration.seconds(30),
      environment: {
        ADDRESSES_TABLE: this.table.tableName,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    this.table.grantReadData(fn);
    this.kmsKey.grantDecrypt(fn);

    return fn;
  }

  private createUpdateAddressFunction(env: string): lambda.Function {
    const fn = new lambda.Function(this, 'UpdateAddressFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'update-address.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/handlers')),
      timeout: cdk.Duration.seconds(30),
      environment: {
        ADDRESSES_TABLE: this.table.tableName,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    this.table.grantReadWriteData(fn);
    this.kmsKey.grantEncryptDecrypt(fn);

    return fn;
  }

  private createDeleteAddressFunction(env: string): lambda.Function {
    const fn = new lambda.Function(this, 'DeleteAddressFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'delete-address.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/handlers')),
      timeout: cdk.Duration.seconds(30),
      environment: {
        ADDRESSES_TABLE: this.table.tableName,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    this.table.grantReadWriteData(fn);
    this.kmsKey.grantEncryptDecrypt(fn);

    return fn;
  }

  private createInitClientFunction(env: string): lambda.Function {
    const fn = new lambda.Function(this, 'InitClientFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'init-client.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/handlers')),
      timeout: cdk.Duration.seconds(30),
      environment: {
        CLIENT_TABLE_NAME: this.clientsTable.tableName,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    this.clientsTable.grantReadWriteData(fn);
    this.kmsKey.grantEncryptDecrypt(fn);

    return fn;
  }
}
