import type { CreateTableCommandInput } from '@aws-sdk/client-dynamodb';

/**
 * The `dadjokes` table (SPEC "Data model"): keys only, no secondary index.
 * On-demand billing: the account's always-free 25 WCU are already used by
 * Pantry and OurToDos, and a joke site's traffic comes in bursts.
 */
export const TABLE_NAME = 'dadjokes';

export function tableDef(name = TABLE_NAME): CreateTableCommandInput {
  return {
    TableName: name,
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  };
}
