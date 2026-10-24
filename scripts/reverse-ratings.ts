import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  type QueryCommandOutput,
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { GROAN_LEVELS } from '@dadjokes/core/jokes';

/**
 * One-off: flip every Dad rating made before the rating scale was labelled (2026-10-24), because
 * visitors read "Left the Room" as the worst joke (SPEC "Rating"). 1 <-> 5, 2 <-> 4, 3 stays.
 *
 *   CUTOFF=<ISO time> pnpm prod:reverse-ratings          # dry run: prints counts
 *   CUTOFF=<ISO time> APPLY=1 pnpm prod:reverse-ratings  # does it
 *
 * Only jokes told before CUTOFF (the deploy that added the scale) are flipped. Each joke's FEED
 * row is updated only if its score is still the one read, its TOP row moves, and STATS.groans is
 * recomputed. STATS.reversedAt marks the run done, so a second run refuses. Mom's partitions
 * are new and left alone. Prints numbers only.
 */
const TABLE = process.env.TABLE ?? 'dadjokes';
const APPLY = process.env.APPLY === '1';
const CUTOFF = process.env.CUTOFF ?? '';
if (!/^\d{4}-\d\d-\d\dT/.test(CUTOFF)) throw new Error('set CUTOFF to an ISO time');
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));
const STATS = { PK: 'STATS', SK: 'STATS' };

const stats = await db.send(new GetCommand({ TableName: TABLE, Key: STATS }));
if (stats.Item?.reversedAt) throw new Error(`already reversed at ${stats.Item.reversedAt}`);

const rows: Array<Record<string, unknown> & { id: string; score?: number; toldAt: string }> = [];
let start: Record<string, unknown> | undefined;
do {
  const out: QueryCommandOutput = await db.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'FEED' },
      ExclusiveStartKey: start,
    }),
  );
  rows.push(...((out.Items ?? []) as typeof rows));
  start = out.LastEvaluatedKey;
} while (start);

const rated = rows.filter((r) => typeof r.score === 'number');
const flip = rated.filter((r) => r.toldAt < CUTOFF && r.score !== 3);
const after = rows.filter((r) => typeof r.score === 'number' && r.toldAt >= CUTOFF);
const hist = (rs: typeof rows, f: (s: number) => number) =>
  [1, 2, 3, 4, 5].map((s) => rs.filter((r) => f(r.score!) === s).length).join('/');
const before = rated.filter((r) => r.toldAt < CUTOFF);
console.log(`jokes ${rows.length}, rated ${rated.length}, rated after cutoff ${after.length}`);
console.log(`scores 1/2/3/4/5 now:   ${hist(before, (s) => s)}`);
console.log(`scores 1/2/3/4/5 after: ${hist(before, (s) => 6 - s)}`);
console.log(`to flip: ${flip.length} (score 3 stays)`);
if (!APPLY) {
  console.log('dry run: set APPLY=1 to write');
  process.exit(0);
}

for (const r of flip) {
  const old = r.score!;
  const level = GROAN_LEVELS[6 - old - 1]!;
  const { PK: _pk, SK: _sk, ...joke } = r;
  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE,
            Key: { PK: 'FEED', SK: r.SK },
            UpdateExpression: 'SET #level = :level, score = :score',
            ConditionExpression: 'score = :old',
            ExpressionAttributeNames: { '#level': 'level' },
            ExpressionAttributeValues: { ':level': level.key, ':score': level.score, ':old': old },
          },
        },
        { Delete: { TableName: TABLE, Key: { PK: 'TOP', SK: `${old}#${r.id}` } } },
        {
          Put: {
            TableName: TABLE,
            Item: {
              ...joke,
              PK: 'TOP',
              SK: `${level.score}#${r.id}`,
              level: level.key,
              score: level.score,
            },
          },
        },
      ],
    }),
  );
}

// Recount groans from the rows as they now stand, and mark the run done.
const fresh: typeof rows = [];
start = undefined;
do {
  const out: QueryCommandOutput = await db.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'FEED' },
      ExclusiveStartKey: start,
    }),
  );
  fresh.push(...((out.Items ?? []) as typeof rows));
  start = out.LastEvaluatedKey;
} while (start);
const nowRated = fresh.filter((r) => typeof r.score === 'number');
const groans = nowRated.reduce((n, r) => n + r.score!, 0);
await db.send(
  new UpdateCommand({
    TableName: TABLE,
    Key: STATS,
    UpdateExpression: 'SET groans = :g, rated = :r, reversedAt = :at',
    ExpressionAttributeValues: {
      ':g': groans,
      ':r': nowRated.length,
      ':at': new Date().toISOString(),
    },
  }),
);
console.log(`flipped ${flip.length}; rated ${nowRated.length}, groans ${groans}`);
