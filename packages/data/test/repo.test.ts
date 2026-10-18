import type { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';
import { GROAN_LEVELS } from '@dadjokes/core/jokes';
import { ulid } from '@dadjokes/core/ids';
import { DynamoRepo } from '../src/repo.js';

/** Records the commands DynamoRepo sends; answers GetItem with `item`. */
function fakeDb(item?: Record<string, unknown>) {
  const sent: unknown[] = [];
  const db = {
    async send(cmd: { input: unknown; constructor: { name: string } }) {
      sent.push(cmd);
      if (cmd.constructor.name === 'GetCommand') return { Item: item };
      return {};
    },
  } as unknown as DynamoDBDocumentClient;
  return { db, sent };
}

describe('DynamoRepo writes', () => {
  it('stores an unrated joke without level/score attributes', async () => {
    const { db, sent } = fakeDb();
    const id = ulid();
    await new DynamoRepo(db, 't').addJoke({
      id,
      key: 'ai',
      category: 'food',
      setup: 's',
      punchline: 'p',
      level: null,
      score: null,
      toldAt: '2026-10-18T00:00:00Z',
      reusedFrom: null,
    });
    const put = (sent[0] as TransactWriteCommand).input.TransactItems![0]!.Put!;
    expect(put.Item).not.toHaveProperty('score');
    expect(put.Item).not.toHaveProperty('level');
  });

  it('rates a row whose score was stored as NULL', async () => {
    const id = ulid();
    const { db, sent } = fakeDb({ PK: 'FEED', SK: `J#${id}`, id, setup: 's', score: null });
    expect(await new DynamoRepo(db, 't').rateJoke(id, GROAN_LEVELS[2]!)).toBe('rated');
    const update = (sent[1] as TransactWriteCommand).input.TransactItems![0]!.Update!;
    expect(update.ConditionExpression).toContain('attribute_type(score, :null)');
  });
});
