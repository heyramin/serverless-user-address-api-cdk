import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

let ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
let docClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * Get the DynamoDB document client
 */
export function getDocClient(): DynamoDBDocumentClient {
  return docClient;
}

/**
 * Set a custom DynamoDB document client (for testing)
 */
export function setDocClient(client: DynamoDBDocumentClient): void {
  docClient = client;
}
