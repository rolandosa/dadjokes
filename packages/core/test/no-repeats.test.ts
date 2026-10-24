import { describe, expect, it } from 'vitest';
import { memoryRepo } from '@dadjokes/data/memory';
import { fingerprints } from '../src/fingerprint.js';
import type { ExternalJokes, Llm } from '../src/ports.js';
import { parseJokeReplies } from '../src/prompts/joke.js';
import { newJoke } from '../src/service.js';

const reply = (...jokes: Array<[string, string]>) =>
  JSON.stringify({ jokes: jokes.map(([setup, punchline]) => ({ setup, punchline })) });

/** A model that answers each call with the next scripted reply, and records what it was sent. */
function scripted(...replies: string[]): Llm & { sent: string[] } {
  const sent: string[] = [];
  return {
    sent,
    async joke(_s, user) {
      sent.push(user);
      return replies[Math.min(sent.length - 1, replies.length - 1)]!;
    },
  };
}

const SCARECROW: [string, string] = [
  'Why did the scarecrow win a Nobel Prize?',
  'Because he was outstanding in his field.',
];
const ATOM: [string, string] = ["Why can't you trust an atom?", 'They make up everything.'];
const FRESH: [string, string] = [
  'Why did the stapler retire early?',
  'It was hitting its last staple.',
];
const opts = { dailyCap: 100 };

describe('fingerprints', () => {
  it('match the rewordings found in the live log', () => {
    const pairs: Array<[[string, string], [string, string]]> = [
      [
        SCARECROW,
        [
          'Why did the scarecrow win the Nobel Prize?',
          'Because he was outstanding in his field of study.',
        ],
      ],
      [
        ["Why don't elephants ever use computers?", "Because they're afraid of the mouse."],
        ["Why don't elephants use computers?", 'Because they are afraid of the mouse.'],
      ],
      [ATOM, ["Why can't you trust an atom?", 'Because they make up everything.']],
    ];
    for (const [a, b] of pairs) {
      const shared = fingerprints(...a).filter((k) => fingerprints(...b).includes(k));
      expect(shared.length).toBeGreaterThan(0);
    }
  });

  it('do not match unrelated jokes that share a short, generic punchline', () => {
    const pairs: Array<[[string, string], [string, string]]> = [
      [
        [
          'I tried to learn origami, but I kept folding under pressure.',
          "I guess I just wasn't cut out for it.",
        ],
        [
          'I tried to learn how to do laundry, but I kept shrinking away from the challenge.',
          "I guess I just wasn't cut out for it.",
        ],
      ],
      [
        ['What did the Zen Buddhist say to the hotdog vendor?', 'Make me one with everything.'],
        ATOM,
      ],
    ];
    for (const [a, b] of pairs) {
      expect(fingerprints(...a).filter((k) => fingerprints(...b).includes(k))).toEqual([]);
    }
  });

  it('tell different jokes apart', () => {
    const shared = fingerprints(...SCARECROW).filter((k) => fingerprints(...FRESH).includes(k));
    expect(shared).toEqual([]);
  });
});

describe('parseJokeReplies', () => {
  it('keeps up to three valid jokes in order and drops bad ones', () => {
    const text = reply(SCARECROW, ['x', 'too short setup'], ATOM, FRESH, [
      'Why a fourth one?',
      'Ignored.',
    ]);
    expect(parseJokeReplies(text).map((j) => j.setup)).toEqual([SCARECROW[0], ATOM[0]]);
  });

  it('accepts a single joke object too', () => {
    expect(parseJokeReplies(JSON.stringify({ setup: FRESH[0], punchline: FRESH[1] }))).toHaveLength(
      1,
    );
  });
});

describe('no repeats', () => {
  it('skips a candidate told before and uses the next one, in the same call', async () => {
    const repo = memoryRepo();
    await newJoke(repo, scripted(reply(SCARECROW)), 'science', opts);
    const llm = scripted(
      reply(
        ['Why did the scarecrow win the Nobel Prize?', 'He was outstanding in his field of study.'],
        FRESH,
      ),
    );
    const { joke, source } = await newJoke(repo, llm, 'science', opts);
    expect(source).toBe('ai');
    expect(joke.setup).toBe(FRESH[0]);
    expect(llm.sent).toHaveLength(1);
  });

  it('asks again, naming the rejected jokes, when all three were told before', async () => {
    const repo = memoryRepo();
    await newJoke(repo, scripted(reply(SCARECROW, ATOM)), 'science', opts);
    await newJoke(repo, scripted(reply(ATOM)), 'science', opts);
    const llm = scripted(reply(SCARECROW, ATOM), reply(FRESH));
    const { joke, source } = await newJoke(repo, llm, 'science', opts);
    expect(source).toBe('ai-retry');
    expect(joke.setup).toBe(FRESH[0]);
    expect(llm.sent).toHaveLength(2);
    const second = JSON.parse(llm.sent[1]!) as { avoid: string[] };
    expect(second.avoid).toEqual(expect.arrayContaining([SCARECROW[0], ATOM[0]]));
  });

  it('falls back to an untold external joke, then the library, after two calls of repeats', async () => {
    const repo = memoryRepo();
    await newJoke(repo, scripted(reply(SCARECROW)), 'classic', opts);
    const ext: ExternalJokes = {
      async find() {
        return [{ id: 'x1', text: 'Why did the cookie go to the doctor? It felt crummy.' }];
      },
    };
    const first = await newJoke(repo, scripted(reply(SCARECROW)), 'classic', {
      ...opts,
      external: ext,
    });
    expect(first.source).toBe('external-after-repeat');
    const second = await newJoke(repo, scripted(reply(SCARECROW)), 'classic', {
      ...opts,
      external: ext,
    });
    expect(second.source).toBe('library-repeat');
    expect(second.joke.setup).not.toBe(SCARECROW[0]);
  });

  it('never tells the same joke twice across 150 pulls of a repetitive model', async () => {
    const repo = memoryRepo();
    // A model that only knows six jokes, offered in a shifting order.
    const known: Array<[string, string]> = [
      SCARECROW,
      ATOM,
      FRESH,
      ['Why did the bicycle fall over?', 'It was two tired.'],
      ['What do you call a fake noodle?', 'An impasta.'],
      ['Why did the math book look sad?', 'Too many problems.'],
    ];
    let n = 0;
    const llm: Llm = {
      async joke() {
        n += 1;
        return reply(...[0, 1, 2].map((k) => known[(n + k) % known.length]!));
      },
    };
    const seen = new Map<string, number>();
    for (let i = 0; i < 150; i++) {
      const { joke, source } = await newJoke(repo, llm, 'classic', opts);
      // Only the model's jokes: the library's last-resort pick may repeat once it runs dry.
      if (source !== 'ai' && source !== 'ai-retry') continue;
      for (const key of fingerprints(joke.setup, joke.punchline))
        seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const modelKeys = known.flatMap(([s, p]) => fingerprints(s, p));
    for (const key of modelKeys) expect(seen.get(key) ?? 0).toBeLessThanOrEqual(1);
  });
});
