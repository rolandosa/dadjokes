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
  reusedFrom: null,
});

beforeAll(async () => {
  await raw.send(new CreateTableCommand(tableDef(name)));
});
afterAll(async () => {
  await raw.send(new DeleteTableCommand({ TableName: name }));
});

describe('DynamoRepo (DynamoDB Local)', () => {
  it('stores, rates, changes a rating, ranks and counts', async () => {
    const a = joke('first');
    const b = joke('second');
    await repo.addJoke(a);
    await repo.addJoke(b);
    expect(await repo.rateJoke(a.id, GROAN_LEVELS[4]!)).toBe('rated');
    expect(await repo.rateJoke(b.id, GROAN_LEVELS[1]!)).toBe('rated');
    expect(await repo.rateJoke(a.id, GROAN_LEVELS[0]!)).toBe('already');
    expect(await repo.changeRating(a.id, GROAN_LEVELS[2]!)).toBe('changed');
    expect(await repo.changeRating(ulid(), GROAN_LEVELS[2]!)).toBe('missing');
    expect(await repo.rateJoke(ulid(), GROAN_LEVELS[0]!)).toBe('missing');

    const board = await repo.board(8);
    expect(board.top.map((j) => j.setup)).toEqual(['first', 'second']);
    expect(board.recent.map((j) => j.setup)).toEqual(['second', 'first']);
    // The change moved "first" from 5 to 3 groans without leaving its old Hall of Groans row.
    expect(board.top.map((j) => j.score)).toEqual([3, 2]);
    expect(board.stats).toEqual({ told: 2, rated: 2, avg: 2.5 });
    expect(await repo.recentSetups(1)).toEqual(['second']);
  });

  it('opens the encore slot only past the bank size, then after the gap', async () => {
    const fresh = new DynamoRepo(makeClient(), name);
    // Two originals are already stored above: bank = 2, sinceReuse = 2.
    expect(await fresh.claimReuse(2, 2)).toBe(false); // bank must be MORE than minBank
    expect(await fresh.claimReuse(1, 3)).toBe(false); // only 2 since the last encore
    expect(await fresh.claimReuse(1, 2)).toBe(true);
    expect(await fresh.claimReuse(1, 0)).toBe(true); // gap 0: always open once bank allows
    expect(await fresh.claimReuse(1, 1)).toBe(false); // the claim reset sinceReuse to 0

    const oldest = await fresh.oldestId();
    expect(oldest).not.toBeNull();
    const encore = { ...joke('first'), reusedFrom: oldest };
    await fresh.addJoke(encore);
    const originals = await fresh.originalsFrom(oldest!, 10);
    expect(originals.map((j) => j.setup)).toEqual(['first', 'second']);
    expect((await fresh.board(8)).recent[0]).toMatchObject({ id: encore.id, reusedFrom: oldest });
  });

  it('counts model calls per day', async () => {
    expect(await repo.bumpAiCalls('2026-10-18')).toBe(1);
    expect(await repo.bumpAiCalls('2026-10-18')).toBe(2);
    expect(await repo.bumpAiCalls('2026-10-19')).toBe(1);
  });
});
