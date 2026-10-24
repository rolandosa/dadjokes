import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { fingerprints } from '@dadjokes/core/fingerprint';

/**
 * One-off clean-up of repeated jokes, and the fingerprint backfill for "No repeats" (SPEC).
 *
 *   pnpm tsx scripts/dedupe-jokes.ts          # dry run: prints what it would do
 *   APPLY=1 pnpm tsx scripts/dedupe-jokes.ts  # does it
 *
 * Jokes that share a fingerprint are one joke. In each group: when any copy is rated, the unrated
 * copies go; of the rated ones the highest score stays (the earliest on a tie). When none is
 * rated, the earliest stays. Removing a copy deletes its FEED row and TOP row and takes it out of
 * the STATS counters. Every remaining joke's fingerprints are then recorded (SEEN rows), so none
 * is told again. Encores are left alone. Prints counts and setups only. Idempotent.
 */
const TABLE = process.env.TABLE ?? 'dadjokes';
const APPLY = process.env.APPLY === '1';
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));

interface Row {
  id: string;
  setup: string;
  punchline: string;
  score?: number | null;
  toldAt: string;
  reusedFrom?: string;
}

const rows: Row[] = [];
let start: Record<string, unknown> | undefined;
do {
  const out = await db.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'FEED' },
      ExclusiveStartKey: start,
    }),
  );
  rows.push(...((out.Items ?? []) as Row[]));
  start = out.LastEvaluatedKey;
} while (start);

const originals = rows.filter((r) => !r.reusedFrom).sort((a, b) => (a.id < b.id ? -1 : 1));

// Union-find: jokes sharing any fingerprint end up in one group.
const parent = new Map<string, string>(originals.map((r) => [r.id, r.id]));
const find = (x: string): string => (parent.get(x) === x ? x : find(parent.get(x)!));
const owner = new Map<string, string>();
for (const r of originals) {
  for (const key of fingerprints(r.setup, r.punchline)) {
    const other = owner.get(key);
    if (other) parent.set(find(r.id), find(other));
    else owner.set(key, r.id);
  }
}
const groups = new Map<string, Row[]>();
for (const r of originals) groups.set(find(r.id), [...(groups.get(find(r.id)) ?? []), r]);

const remove: Row[] = [];
for (const group of groups.values()) {
  if (group.length < 2) continue;
  const rated = group.filter((r) => r.score != null);
  const pool = rated.length ? rated : group;
  // Highest score first; earliest (smallest id) on a tie.
  const keep = [...pool].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.id < b.id ? -1 : 1),
  )[0]!;
  const gone = group.filter((r) => r !== keep);
  remove.push(...gone);
  console.log(
    `keep  [${keep.score ?? '-'}] ${keep.setup}\n` +
      gone.map((r) => `  drop [${r.score ?? '-'}] ${r.setup}`).join('\n'),
  );
}

const ratedGone = remove.filter((r) => r.score != null);
const groans = ratedGone.reduce((n, r) => n + Number(r.score), 0);
const goneIds = new Set(remove.map((r) => r.id));
const keepRows = rows.filter((r) => !goneIds.has(r.id));
const keys = [...new Set(keepRows.flatMap((r) => fingerprints(r.setup, r.punchline)))];
console.log(
  `\n${originals.length} originals, ${groups.size} distinct jokes; removing ${remove.length} ` +
    `(${ratedGone.length} rated, ${groans} groans); ${keys.length} fingerprints to record.`,
);

if (!APPLY) {
  console.log('Dry run: nothing changed. APPLY=1 to apply.');
  process.exit(0);
}

for (const r of remove) {
  await db.send(new DeleteCommand({ TableName: TABLE, Key: { PK: 'FEED', SK: `J#${r.id}` } }));
  if (r.score != null) {
    await db.send(
      new DeleteCommand({ TableName: TABLE, Key: { PK: 'TOP', SK: `${r.score}#${r.id}` } }),
    );
  }
}
if (remove.length) {
  await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: 'STATS', SK: 'STATS' },
      UpdateExpression: 'ADD told :told, bank :told, rated :rated, groans :groans',
      ExpressionAttributeValues: {
        ':told': -remove.length,
        ':rated': -ratedGone.length,
        ':groans': -groans,
      },
    }),
  );
}
let recorded = 0;
for (const key of keys) {
  try {
    await db.send(
      new PutCommand({
        TableName: TABLE,
        Item: { PK: 'SEEN', SK: key },
        ConditionExpression: 'attribute_not_exists(PK)',
      }),
    );
    recorded += 1;
  } catch (err) {
    if (!(err instanceof ConditionalCheckFailedException)) throw err;
  }
}
console.log(`Applied: removed ${remove.length} jokes, recorded ${recorded} new fingerprints.`);
