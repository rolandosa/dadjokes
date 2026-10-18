import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import {
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { GroanLevel } from '@dadjokes/core/jokes';
import type { Repo } from '@dadjokes/core/ports';
import type { Board, ToldJoke } from '@dadjokes/core/types';
import { FEED, STATS, TOP, aiCallsSk, feedSk, topSk } from './keys.js';

const JOKE_FIELDS = [
  'id',
  'key',
  'category',
  'setup',
  'punchline',
  'level',
  'score',
  'toldAt',
] as const;

function toJoke(item: Record<string, unknown>): ToldJoke {
  const out: Record<string, unknown> = {};
  for (const f of JOKE_FIELDS) out[f] = item[f] ?? null;
  return out as unknown as ToldJoke;
}

export class DynamoRepo implements Repo {
  constructor(
    private readonly db: DynamoDBDocumentClient,
    private readonly table: string,
  ) {}

  async addJoke(joke: ToldJoke): Promise<void> {
    await this.db.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: this.table,
              Item: { PK: FEED, SK: feedSk(joke.id), ...joke },
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
          {
            Update: {
              TableName: this.table,
              Key: { PK: STATS, SK: STATS },
              UpdateExpression: 'ADD told :one',
              ExpressionAttributeValues: { ':one': 1 },
            },
          },
        ],
      }),
    );
  }

  async rateJoke(id: string, level: GroanLevel): Promise<'rated' | 'missing' | 'already'> {
    const key = { PK: FEED, SK: feedSk(id) };
    const found = await this.db.send(new GetCommand({ TableName: this.table, Key: key }));
    if (!found.Item) return 'missing';
    if (found.Item.score != null) return 'already';
    const rated = { ...toJoke(found.Item), level: level.key, score: level.score };
    try {
      await this.db.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: this.table,
                Key: key,
                UpdateExpression: 'SET #level = :level, score = :score',
                // A second rating racing this one loses here, so counts stay right.
                ConditionExpression: 'attribute_exists(PK) AND attribute_not_exists(score)',
                ExpressionAttributeNames: { '#level': 'level' },
                ExpressionAttributeValues: { ':level': level.key, ':score': level.score },
              },
            },
            {
              Put: {
                TableName: this.table,
                Item: { PK: TOP, SK: topSk(level.score, id), ...rated },
              },
            },
            {
              Update: {
                TableName: this.table,
                Key: { PK: STATS, SK: STATS },
                UpdateExpression: 'ADD rated :one, groans :score',
                ExpressionAttributeValues: { ':one': 1, ':score': level.score },
              },
            },
          ],
        }),
      );
    } catch (err) {
      if (err instanceof TransactionCanceledException) return 'already';
      throw err;
    }
    return 'rated';
  }

  async board(limit: number): Promise<Board> {
    const newest = (pk: string) =>
      this.db.send(
        new QueryCommand({
          TableName: this.table,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: { ':pk': pk },
          ScanIndexForward: false,
          Limit: limit,
        }),
      );
    const [top, recent, stats] = await Promise.all([
      newest(TOP),
      newest(FEED),
      this.db.send(new GetCommand({ TableName: this.table, Key: { PK: STATS, SK: STATS } })),
    ]);
    const told = Number(stats.Item?.told ?? 0);
    const rated = Number(stats.Item?.rated ?? 0);
    const groans = Number(stats.Item?.groans ?? 0);
    return {
      top: (top.Items ?? []).map(toJoke),
      recent: (recent.Items ?? []).map(toJoke),
      stats: { told, rated, avg: rated ? groans / rated : 0 },
    };
  }

  async recentSetups(limit: number): Promise<string[]> {
    const out = await this.db.send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': FEED },
        ProjectionExpression: 'setup',
        ScanIndexForward: false,
        Limit: limit,
      }),
    );
    return (out.Items ?? []).map((i) => String(i.setup));
  }

  async bumpAiCalls(day: string): Promise<number> {
    const out = await this.db.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { PK: STATS, SK: aiCallsSk(day) },
        UpdateExpression: 'ADD calls :one',
        ExpressionAttributeValues: { ':one': 1 },
        ReturnValues: 'UPDATED_NEW',
      }),
    );
    return Number(out.Attributes?.calls ?? 1);
  }
}
