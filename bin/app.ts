#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { UserAddressApiStack } from '../lib/user-address-api-stack';

const app = new cdk.App();

const environment = app.node.tryGetContext('environment') || 'dev';

if (!['dev', 'prod'].includes(environment)) {
  throw new Error('Invalid environment. Must be "dev" or "prod"');
}

new UserAddressApiStack(app, `UserAddressApiStack-${environment}`, {
  environment: environment as 'dev' | 'prod',
  env: {
    region: 'ap-southeast-2',
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

app.synth();
