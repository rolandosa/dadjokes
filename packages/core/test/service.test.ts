import { describe, expect, it } from 'vitest';
import { memoryRepo } from '@dadjokes/data/memory';
import { allJokes, jokeByKey } from '../src/jokes.js';
import type { Llm } from '../src/ports.js';
import { parseJokeReply } from '../src/prompts/joke.js';
import { BadInput, Conflict, NotFound, board, newJoke, rateJoke } from '../src/service.js';

const llmSaying = (text: string): Llm & { calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    async joke(_system, user) {
      calls.push(user);
      return text;
    },
  };
};
const GOOD =
  '{"setup": "Why did the stapler retire?", "punchline": "It was hitting its last staple."}';

describe('newJoke', () => {
  it('stores a joke the model wrote, under the asked category', async () => {
    const repo = memoryRepo();
    const { joke, source } = await newJoke(repo, llmSaying(GOOD), 'vault', { dailyCap: 10 });
    expect(source).toBe('ai');
    expect(joke).toMatchObject({
      key: 'ai',
      category: 'vault',
      setup: 'Why did the stapler retire?',
    });
    expect((await board(repo)).recent.map((j) => j.id)).toEqual([joke.id]);
  });

  it('tells the model the topic and the recent setups to avoid', async () => {
    const repo = memoryRepo();
    const llm = llmSaying(GOOD);
    await newJoke(repo, llm, 'food', { dailyCap: 10 });
    await newJoke(repo, llm, 'food', { dailyCap: 10 });
    const sent = JSON.parse(llm.calls[1]!) as { topic: string; avoid: string[] };
    expect(sent.topic).toContain('food');
    expect(sent.avoid).toEqual(['Why did the stapler retire?']);
  });

  it.each([
    ['invalid JSON', 'Sure! Here is a joke: why...'],
    ['the wrong schema', '{"joke": "knock knock"}'],
    ['a refusal', '{"setup": null, "punchline": null}'],
    ['a blocked word', '{"setup": "Why was the beer sad today?", "punchline": "It was bitter."}'],
  ])('falls back to an untold library joke on %s', async (_case, reply) => {
    const repo = memoryRepo();
    const { joke, source } = await newJoke(repo, llmSaying(reply), 'animals', { dailyCap: 10 });
    expect(source).toBe('library-bad-reply');
    expect(jokeByKey(joke.key)?.setup).toBe(joke.setup);
    expect(joke.category).toBe('animals');
  });

  it('falls back when the model call throws, and without a model', async () => {
    const failing: Llm = {
      async joke() {
        throw new Error('throttled');
      },
    };
    expect((await newJoke(memoryRepo(), failing, 'food', { dailyCap: 10 })).source).toBe(
      'library-llm-error',
    );
    expect((await newJoke(memoryRepo(), null, 'food', { dailyCap: 10 })).source).toBe(
      'library-no-llm',
    );
  });

  it('stops calling the model once the daily cap is reached', async () => {
    const repo = memoryRepo();
    const llm = llmSaying(GOOD);
    const now = new Date('2026-10-18T12:00:00Z');
    const sources = [];
    for (let i = 0; i < 3; i++)
      sources.push((await newJoke(repo, llm, 'any', { dailyCap: 2, now })).source);
    expect(sources).toEqual(['ai', 'ai', 'library-cap']);
    expect(llm.calls).toHaveLength(2);
  });

  it('picks a real category for "any" or junk input', async () => {
    const { joke } = await newJoke(memoryRepo(), null, '<script>', {
      dailyCap: 0,
      random: () => 0,
    });
    expect(joke.category).toBe('classic');
  });
});

describe('rateJoke', () => {
  it('rates once and updates the board', async () => {
    const repo = memoryRepo();
    const { joke } = await newJoke(repo, llmSaying(GOOD), 'classic', { dailyCap: 10 });
    await rateJoke(repo, joke.id, 'left_the_room');
    const b = await board(repo);
    expect(b.top[0]).toMatchObject({ id: joke.id, level: 'left_the_room', score: 5 });
    expect(b.stats).toEqual({ told: 1, rated: 1, avg: 5 });
    await expect(rateJoke(repo, joke.id, 'eye_roll')).rejects.toBeInstanceOf(Conflict);
  });

  it('rejects unknown ids and levels', async () => {
    const repo = memoryRepo();
    await expect(rateJoke(repo, 'nope', 'eye_roll')).rejects.toBeInstanceOf(NotFound);
    await expect(rateJoke(repo, '01JABCDEFGHJKMNPQRSTVWXYZ0', 'eye_roll')).rejects.toBeInstanceOf(
      NotFound,
    );
    const { joke } = await newJoke(repo, null, 'food', { dailyCap: 0 });
    await expect(rateJoke(repo, joke.id, 'meh')).rejects.toBeInstanceOf(BadInput);
  });
});

describe('library', () => {
  it('round-trips every key', () => {
    for (const j of allJokes()) expect(jokeByKey(j.key)).toEqual(j);
    expect(jokeByKey('food:999')).toBeNull();
    expect(jokeByKey('nope:1')).toBeNull();
  });
});

describe('parseJokeReply', () => {
  it('accepts JSON wrapped in prose and trims whitespace', () => {
    expect(parseJokeReply(`Here you go:\n${GOOD}\n`)).toEqual({
      setup: 'Why did the stapler retire?',
      punchline: 'It was hitting its last staple.',
    });
  });

  it('rejects over-long parts', () => {
    expect(parseJokeReply(JSON.stringify({ setup: 'x'.repeat(200), punchline: 'y' }))).toBeNull();
  });
});

describe('ids', () => {
  it('increase even within one millisecond', async () => {
    const { ulid } = await import('../src/ids.js');
    const ids = Array.from({ length: 50 }, () => ulid());
    expect([...ids].sort()).toEqual(ids);
  });
});
