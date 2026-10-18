import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * The document client. `DDB_ENDPOINT` points it at DynamoDB Local; without
 * it the SDK's normal region and credential chain apply (Lambda's role).
 */
export function makeClient(): DynamoDBDocumentClient {
  const endpoint = process.env.DDB_ENDPOINT;
  const client = new DynamoDBClient(
    endpoint ? { endpoint, region: process.env.AWS_REGION ?? 'us-east-1' } : {},
  );
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

let shared: DynamoDBDocumentClient | undefined;
/** One client per container, built on first use. */
export function sharedClient(): DynamoDBDocumentClient {
  shared ??= makeClient();
  return shared;
}

export function tableName(): string {
  return process.env.TABLE ?? 'dadjokes';
}
