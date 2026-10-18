import { describe, expect, it } from 'vitest';
import { memoryRepo } from '@dadjokes/data/memory';
import { ulid } from '../src/ids.js';
import type { Llm, Repo } from '../src/ports.js';
import { REUSE_GAP, REUSE_MIN_BANK, newJoke } from '../src/service.js';
import type { ToldJoke } from '../src/types.js';

/** A model that writes a different joke every call. */
function freshWriter(): Llm {
  let n = 0;
  return {
    async joke() {
      n += 1;
      return JSON.stringify({
        setup: `Why did fresh joke ${n} cross the road?`,
        punchline: `Pun ${n}.`,
      });
    },
  };
}

async function fillBank(repo: Repo, count: number, category: ToldJoke['category'] = 'food') {
  for (let i = 0; i < count; i++) {
    await repo.addJoke({
      id: ulid(),
      key: 'ai',
      category,
      setup: `Banked ${category} joke ${i}?`,
      punchline: `Banked pun ${i}.`,
      level: null,
      score: null,
      toldAt: new Date().toISOString(),
      reusedFrom: null,
    });
  }
}

async function pulls(repo: Repo, n: number, category: unknown = 'food') {
  const llm = freshWriter();
  const out = [];
  for (let i = 0; i < n; i++) out.push(await newJoke(repo, llm, category, { dailyCap: 10_000 }));
  return out;
}

describe('encores', () => {
  it('never reuses while the bank holds 200 jokes or fewer', async () => {
    const repo = memoryRepo();
    await fillBank(repo, REUSE_MIN_BANK - 50);
    const told = await pulls(repo, 50); // the bank reaches exactly 200
    expect(told.filter((t) => t.source === 'encore')).toHaveLength(0);
  });

  it('past 200, reuses at most 1 in any 10 and never 2 in a row', async () => {
    const repo = memoryRepo();
    await fillBank(repo, REUSE_MIN_BANK + 1);
    const told = await pulls(repo, 100);
    const isEncore = told.map((t) => t.source === 'encore');
    expect(isEncore.filter(Boolean).length).toBeGreaterThan(0);
    for (let i = 1; i < isEncore.length; i++) expect(isEncore[i] && isEncore[i - 1]).toBe(false);
    for (let i = 0; i + 10 <= isEncore.length; i++) {
      expect(isEncore.slice(i, i + 10).filter(Boolean).length).toBeLessThanOrEqual(1);
    }
    // The slot reopens after exactly REUSE_GAP originals, so encores are evenly spaced.
    const at = isEncore.flatMap((e, i) => (e ? [i] : []));
    for (let i = 1; i < at.length; i++) expect(at[i]! - at[i - 1]!).toBe(REUSE_GAP + 1);
  });

  it('repeats a stored original from the asked category, not one told recently', async () => {
    const repo = memoryRepo();
    await fillBank(repo, REUSE_MIN_BANK + 1, 'animals');
    await fillBank(repo, 30, 'food');
    const told = await pulls(repo, 40, 'animals');
    const encores = told.filter((t) => t.source === 'encore');
    expect(encores.length).toBeGreaterThan(0);
    for (const e of encores) {
      // From the asked category: a banked animals joke or an earlier model-written one, never food.
      expect(e.joke.category).toBe('animals');
      expect(e.joke.setup).not.toMatch(/^Banked food joke/);
      expect(e.joke.reusedFrom).toMatch(/^[0-9A-Z]{26}$/);
      const i = told.indexOf(e);
      expect(told.slice(Math.max(0, i - 20), i).map((t) => t.joke.setup)).not.toContain(
        e.joke.setup,
      );
    }
  });

  it('prefers the best-rated joke among those it draws', async () => {
    const repo = memoryRepo();
    await fillBank(repo, REUSE_MIN_BANK + 1);
    // With random() = 0 the draw starts at the oldest joke and sees the first DRAW_SIZE (25).
    const first = await repo.originalsFrom('0'.repeat(26), 25);
    const star = first[10]!;
    const level = (score: 1 | 5) =>
      ({
        score,
        key: score === 5 ? 'left_the_room' : 'polite_nod',
        label: '',
        emoji: '',
        quip: '',
      }) as const;
    for (const j of first) await repo.rateJoke(j.id, level(j.id === star.id ? 5 : 1));

    const { joke, source } = await newJoke(repo, freshWriter(), 'food', {
      dailyCap: 10,
      random: () => 0,
    });
    expect(source).toBe('encore');
    expect(joke.reusedFrom).toBe(star.id);
    expect(joke.setup).toBe(star.setup);
    expect(joke.score).toBeNull();
  });
});
