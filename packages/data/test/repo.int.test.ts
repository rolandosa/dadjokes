import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GROAN_LEVELS } from '@dadjokes/core/jokes';
import { ulid } from '@dadjokes/core/ids';
import type { ToldJoke } from '@dadjokes/core/types';
import { makeClient } from '../src/client.js';
import { DynamoRepo } from '../src/repo.js';
import { tableDef } from '../src/table-def.js';

const name = `dadjokes-int-${Date.now()}`;
const raw = new DynamoDBClient({ endpoint: process.env.DDB_ENDPOINT, region: 'us-east-1' });
const repo = new DynamoRepo(makeClient(), name);

const joke = (setup: string): ToldJoke => ({
  id: ulid(),
  key: 'ai',
  category: 'food',
  setup,
  punchline: 'p',
  level: null,
  score: null,
  toldAt: new Date().toISOString(),
});

beforeAll(async () => {
  await raw.send(new CreateTableCommand(tableDef(name)));
});
afterAll(async () => {
  await raw.send(new DeleteTableCommand({ TableName: name }));
});

describe('DynamoRepo (DynamoDB Local)', () => {
  it('stores, rates once, ranks and counts', async () => {
    const a = joke('first');
    const b = joke('second');
    await repo.addJoke(a);
    await repo.addJoke(b);
    expect(await repo.rateJoke(a.id, GROAN_LEVELS[4]!)).toBe('rated');
    expect(await repo.rateJoke(b.id, GROAN_LEVELS[1]!)).toBe('rated');
    expect(await repo.rateJoke(a.id, GROAN_LEVELS[0]!)).toBe('already');
    expect(await repo.rateJoke(ulid(), GROAN_LEVELS[0]!)).toBe('missing');

    const board = await repo.board(8);
    expect(board.top.map((j) => j.setup)).toEqual(['first', 'second']);
    expect(board.recent.map((j) => j.setup)).toEqual(['second', 'first']);
    expect(board.stats).toEqual({ told: 2, rated: 2, avg: 3.5 });
    expect(await repo.recentSetups(1)).toEqual(['second']);
  });

  it('counts model calls per day', async () => {
    expect(await repo.bumpAiCalls('2026-10-18')).toBe(1);
    expect(await repo.bumpAiCalls('2026-10-18')).toBe(2);
    expect(await repo.bumpAiCalls('2026-10-19')).toBe(1);
  });
});
