import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from './client';

export interface ClientRecord {
  clientId: string;
  clientSecret: string;
  clientName: string;
  description?: string;
  active: boolean;
  createdAt: string;
  expiresAt: string;
}

/**
 * Get a client by clientId from the clients table
 */
export async function getClient(clientId: string): Promise<ClientRecord | undefined> {
  const tableName = process.env.CLIENTS_TABLE || 'user-address-clients-dev';
  const docClient = getDocClient();

  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { clientId },
    })
  );

  return result.Item as ClientRecord | undefined;
}

/**
 * Create a new client record in the clients table
 */
export async function createClient(clientRecord: ClientRecord): Promise<void> {
  const tableName = process.env.CLIENT_TABLE_NAME || 'user-address-clients-dev';
  const docClient = getDocClient();

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: clientRecord,
    })
  );
}
