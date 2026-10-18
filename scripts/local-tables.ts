import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  ResourceInUseException,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { tableDef } from '@dadjokes/data/table-def';

/** Creates the `dadjokes` table in DynamoDB Local; `--reset` drops it first. */
const endpoint = process.env.DDB_ENDPOINT;
if (!endpoint) {
  console.error('DDB_ENDPOINT is not set: this script only talks to DynamoDB Local.');
  process.exit(1);
}
const client = new DynamoDBClient({ endpoint, region: process.env.AWS_REGION ?? 'us-east-1' });
const name = process.env.TABLE ?? 'dadjokes';

if (process.argv.includes('--reset')) {
  try {
    await client.send(new DeleteTableCommand({ TableName: name }));
    console.log(`dropped ${name}`);
  } catch (err) {
    if (!(err instanceof ResourceNotFoundException)) throw err;
  }
}
try {
  await client.send(new CreateTableCommand(tableDef(name)));
  console.log(`created ${name}`);
} catch (err) {
  if (!(err instanceof ResourceInUseException)) throw err;
  console.log(`${name} already exists`);
}
