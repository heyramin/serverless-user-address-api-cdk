import { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from './client';
import { Address } from '../types/address';

/**
 * Query addresses for a user, optionally filtered by suburb or postcode
 */
export async function queryAddresses(
  userId: string,
  suburb?: string,
  postcode?: string
): Promise<Address[]> {
  const tableName = process.env.ADDRESSES_TABLE || 'user-addresses-dev';
  const docClient = getDocClient();

  let indexName: string | undefined;
  let keyConditionExpression = 'userId = :userId';
  const expressionAttributeValues: any = {
    ':userId': userId,
  };

  // Use appropriate GSI if filtering by suburb or postcode
  if (suburb) {
    indexName = 'suburbIndex';
    keyConditionExpression = 'userId = :userId AND suburb = :suburb';
    expressionAttributeValues[':suburb'] = suburb;
  } else if (postcode) {
    indexName = 'postcodeIndex';
    keyConditionExpression = 'userId = :userId AND postcode = :postcode';
    expressionAttributeValues[':postcode'] = postcode;
  }

  const queryParams: any = {
    TableName: tableName,
    IndexName: indexName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues,
  };

  // Add FilterExpression if filtering by postcode when suburb is also provided
  if (suburb && postcode) {
    queryParams.FilterExpression = 'postcode = :postcode';
    queryParams.ExpressionAttributeValues[':postcode'] = postcode;
  }

  const result = await docClient.send(
    new QueryCommand(queryParams)
  );

  return (result.Items as Address[]) || [];
}

/**
 * Store a new address for a user
 */
export async function storeAddress(address: Address): Promise<void> {
  const tableName = process.env.ADDRESSES_TABLE || 'user-addresses-dev';
  const docClient = getDocClient();

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: address,
    })
  );
}

/**
 * Update an existing address
 */
export async function updateAddress(
  userId: string,
  addressId: string,
  updates: Record<string, any>,
  names: Record<string, string>,
  updateExpression: string
): Promise<any> {
  const tableName = process.env.ADDRESSES_TABLE || 'user-addresses-dev';
  const docClient = getDocClient();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        userId,
        addressId,
      },
      UpdateExpression: `SET ${updateExpression}`,
      ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
      ExpressionAttributeValues: Object.keys(updates).length > 0 ? updates : undefined,
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes;
}

/**
 * Delete an address
 */
export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  const tableName = process.env.ADDRESSES_TABLE || 'user-addresses-dev';
  const docClient = getDocClient();

  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        userId,
        addressId,
      },
    })
  );
}
