import { describe, expect, it } from 'vitest';
import { memoryRepo } from '@dadjokes/data/memory';
import { ulid } from '../src/ids.js';
import { SITE_CATEGORIES } from '../src/jokes.js';
import type { Llm } from '../src/ports.js';
import { REUSE_MIN_BANK, board, newJoke } from '../src/service.js';

let n = 0;
const writer: Llm = {
  async joke() {
    n += 1;
    return JSON.stringify({ setup: `Why did site joke ${n} happen?`, punchline: `Reason ${n}.` });
  },
};
const opts = { dailyCap: 10_000, categories: SITE_CATEGORIES };

describe('site categories (no Vault & Pharma)', () => {
  it('leaves Vault & Pharma out of the site', () => {
    expect(SITE_CATEGORIES).not.toContain('vault');
    expect(SITE_CATEGORIES).toEqual(['classic', 'food', 'science', 'animals']);
  });

  it('never tells a vault joke, even when asked for one', async () => {
    const repo = memoryRepo();
    for (const asked of ['vault', 'any', undefined, 'vault', 'any']) {
      for (let i = 0; i < 40; i++) {
        const { joke } = await newJoke(repo, writer, asked, opts);
        expect(joke.category).not.toBe('vault');
      }
    }
  });

  it('never replays a stored vault joke as an encore', async () => {
    const repo = memoryRepo();
    for (let i = 0; i <= REUSE_MIN_BANK; i++) {
      await repo.addJoke({
        id: ulid(),
        key: 'ai',
        category: 'vault',
        setup: `Old vault joke ${i}?`,
        punchline: 'p',
        level: null,
        score: null,
        toldAt: new Date().toISOString(),
        reusedFrom: null,
      });
    }
    for (let i = 0; i < 60; i++) {
      const { joke, source } = await newJoke(repo, writer, 'any', opts);
      expect(joke.category).not.toBe('vault');
      if (source === 'encore') expect(joke.setup).not.toMatch(/^Old vault joke/);
    }
  });

  it('keeps old vault jokes out of the Hall of Groans and the latest list', async () => {
    const repo = memoryRepo();
    await newJoke(repo, writer, 'food', opts);
    await repo.addJoke({
      id: ulid(),
      key: 'ai',
      category: 'vault',
      setup: 'An old vault joke?',
      punchline: 'p',
      level: null,
      score: null,
      toldAt: new Date().toISOString(),
      reusedFrom: null,
    });
    const b = await board(repo, SITE_CATEGORIES);
    expect(b.recent.map((j) => j.category)).toEqual(['food']);
    expect(b.stats.told).toBe(2);
  });
});
