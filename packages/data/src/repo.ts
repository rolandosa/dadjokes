import {
  ConditionalCheckFailedException,
  TransactionCanceledException,
} from '@aws-sdk/client-dynamodb';
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
  'reusedFrom',
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
    // An unrated joke has no level/score attributes at all (not NULLs), so rateJoke's
    // "not rated yet" condition can test for their absence; an original has no reusedFrom,
    // so originalsFrom can filter on its absence.
    const { level: _level, score: _score, reusedFrom, ...unrated } = joke;
    const row = reusedFrom ? { ...unrated, reusedFrom } : unrated;
    await this.db.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: this.table,
              Item: { PK: FEED, SK: feedSk(joke.id), ...row },
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
          {
            Update: {
              TableName: this.table,
              Key: { PK: STATS, SK: STATS },
              // bank: originals stored; sinceReuse: originals since the last encore.
              UpdateExpression: reusedFrom
                ? 'ADD told :one, reused :one'
                : 'ADD told :one, bank :one, sinceReuse :one',
              ExpressionAttributeValues: { ':one': 1 },
            },
          },
        ],
      }),
    );
  }

  async claimReuse(minBank: number, gap: number): Promise<boolean> {
    try {
      await this.db.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { PK: STATS, SK: STATS },
          UpdateExpression: 'SET sinceReuse = :zero',
          ConditionExpression:
            'bank > :minBank AND (attribute_not_exists(sinceReuse) OR sinceReuse >= :gap)',
          ExpressionAttributeValues: { ':zero': 0, ':minBank': minBank, ':gap': gap },
        }),
      );
      return true;
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) return false;
      throw err;
    }
  }

  async oldestId(): Promise<string | null> {
    const out = await this.db.send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': FEED },
        ProjectionExpression: 'id',
        Limit: 1,
      }),
    );
    const id = out.Items?.[0]?.id;
    return typeof id === 'string' ? id : null;
  }

  async originalsFrom(fromId: string, limit: number): Promise<ToldJoke[]> {
    const out = await this.db.send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: 'PK = :pk AND SK >= :from',
        FilterExpression: 'attribute_not_exists(reusedFrom)',
        ExpressionAttributeValues: { ':pk': FEED, ':from': feedSk(fromId) },
        Limit: limit,
      }),
    );
    return (out.Items ?? []).map(toJoke);
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
                // A second rating racing this one loses here, so counts stay right. Rows
                // written before addJoke stopped storing NULLs carry score = NULL.
                ConditionExpression:
                  'attribute_exists(PK) AND (attribute_not_exists(score) OR attribute_type(score, :null))',
                ExpressionAttributeNames: { '#level': 'level' },
                ExpressionAttributeValues: {
                  ':level': level.key,
                  ':score': level.score,
                  ':null': 'NULL',
                },
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
