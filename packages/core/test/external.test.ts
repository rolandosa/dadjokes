import { describe, expect, it } from 'vitest';
import { memoryRepo } from '@dadjokes/data/memory';
import { externalKey, splitJoke } from '../src/external.js';
import type { ExternalJokes, Llm } from '../src/ports.js';
import { JOKE_SYSTEM, jokeUserMessage } from '../src/prompts/joke.js';
import { CATEGORIES } from '../src/jokes.js';
import { newJoke } from '../src/service.js';

const writer: Llm = {
  async joke() {
    return '{"setup": "Why did the written joke work?", "punchline": "It had a good draft."}';
  },
};

function collection(texts: string[]): ExternalJokes & { terms: Array<string | null> } {
  const terms: Array<string | null> = [];
  return {
    terms,
    async find(term) {
      terms.push(term);
      return texts.map((text, i) => ({ id: `id${i}`, text }));
    },
  };
}

describe('splitJoke', () => {
  it.each([
    [
      'What do you call a fake noodle? An impasta.',
      'What do you call a fake noodle?',
      'An impasta.',
    ],
    [
      'I used to hate facial hair. But then it grew on me.',
      'I used to hate facial hair.',
      'But then it grew on me.',
    ],
    [
      'Why did the cow cross the road?\n\n- To get to the udder side.',
      'Why did the cow cross the road?',
      'To get to the udder side.',
    ],
  ])('splits %j', (text, setup, punchline) => {
    expect(splitJoke(text)).toEqual({ setup, punchline });
  });

  it('rejects one-liners, blocked words and over-long jokes', () => {
    expect(splitJoke('I am a one-liner with no break')).toBeNull();
    expect(splitJoke('Why was the beer happy? It was on tap.')).toBeNull();
    expect(splitJoke(`Why ${'very '.repeat(40)}long? Yes.`)).toBeNull();
  });
});

describe('external jokes', () => {
  it('takes a joke from the collection, keyed by its id, in the asked category', async () => {
    const repo = memoryRepo();
    const ext = collection(['What do you call a pig that does karate? A pork chop.']);
    const { joke, source } = await newJoke(repo, writer, 'animals', {
      dailyCap: 10,
      external: ext,
      externalShare: 1,
    });
    expect(source).toBe('external');
    expect(joke).toMatchObject({
      key: externalKey('id0'),
      category: 'animals',
      setup: 'What do you call a pig that does karate?',
      punchline: 'A pork chop.',
    });
    expect(CATEGORIES.animals.external).toContain(ext.terms[0]);
  });

  it('never tells the same external joke twice; the model writes instead', async () => {
    const repo = memoryRepo();
    const ext = collection(['What do you call a pig that does karate? A pork chop.']);
    const opts = { dailyCap: 10, external: ext, externalShare: 1 };
    expect((await newJoke(repo, writer, 'animals', opts)).source).toBe('external');
    expect((await newJoke(repo, writer, 'animals', opts)).source).toBe('ai');
  });

  it('uses the random endpoint for Classics and nothing external for Vault & Pharma', async () => {
    const ext = collection(['Why did the scarecrow win? He was outstanding in his field.']);
    await newJoke(memoryRepo(), writer, 'classic', {
      dailyCap: 10,
      external: ext,
      externalShare: 1,
    });
    expect(ext.terms).toEqual([null]);
    const vault = await newJoke(memoryRepo(), writer, 'vault', {
      dailyCap: 10,
      external: ext,
      externalShare: 1,
    });
    expect(vault.source).toBe('ai');
    expect(ext.terms).toHaveLength(1);
  });

  it('falls back to the model when the collection fails or has nothing usable', async () => {
    const down: ExternalJokes = {
      async find() {
        throw new Error('timeout');
      },
    };
    const opts = { dailyCap: 10, externalShare: 1 };
    expect((await newJoke(memoryRepo(), writer, 'food', { ...opts, external: down })).source).toBe(
      'ai',
    );
    const unusable = collection(['one-liner without a split']);
    expect(
      (await newJoke(memoryRepo(), writer, 'food', { ...opts, external: unusable })).source,
    ).toBe('ai');
  });

  it('takes about the configured share from the collection', async () => {
    const repo = memoryRepo();
    let n = 0;
    const ext: ExternalJokes = {
      async find() {
        n += 1;
        return [{ id: `j${n}`, text: `Why did joke ${n} cross the road? To get across.` }];
      },
    };
    let external = 0;
    for (let i = 0; i < 400; i++) {
      const r = await newJoke(repo, writer, 'classic', {
        dailyCap: 1000,
        external: ext,
        externalShare: 0.4,
      });
      if (r.source === 'external') external += 1;
    }
    expect(external).toBeGreaterThan(400 * 0.3);
    expect(external).toBeLessThan(400 * 0.5);
  });
});

describe('the joke prompt', () => {
  it('keeps Veeva and pharma out unless the topic is the Vault category', () => {
    expect(JOKE_SYSTEM).not.toMatch(/audience is Veeva/i);
    expect(JOKE_SYSTEM).toMatch(/only the topic/i);
    expect(jokeUserMessage(CATEGORIES.food.topic, [])).not.toMatch(/veeva|vault|pharma/i);
    expect(CATEGORIES.vault.topic).toMatch(/Veeva/);
  });
});
