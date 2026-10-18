import { ULID_RE, ulid } from './ids.js';
import { CATEGORIES, CATEGORY_KEYS, generateJoke, isCategory, levelByKey } from './jokes.js';
import type { CategoryKey } from './jokes.js';
import type { Llm, Repo } from './ports.js';
import { JOKE_SYSTEM, jokeUserMessage, parseJokeReply } from './prompts/joke.js';
import type { Board, ToldJoke } from './types.js';

/** How many jokes each list on the page shows. */
export const BOARD_SIZE = 8;

export class NotFound extends Error {
  override name = 'NotFound';
}
export class BadInput extends Error {
  override name = 'BadInput';
}
export class Conflict extends Error {
  override name = 'Conflict';
}

/** How many recent setups the model is asked not to repeat. */
const AVOID_COUNT = 20;

export interface NewJokeOptions {
  /** Model calls allowed per UTC day; past it, jokes come from the library. */
  dailyCap: number;
  now?: Date;
  random?: () => number;
}

/** Why a joke came from the library instead of the model, for the log line. */
export type JokeSource =
  'ai' | 'library-no-llm' | 'library-cap' | 'library-bad-reply' | 'library-llm-error';

/**
 * Writes a new joke with the model and stores it. Falls back to an untold library joke when
 * there is no model, the daily cap is reached, the call fails or the reply breaks the rules,
 * so the lever always produces a joke.
 */
export async function newJoke(
  repo: Repo,
  llm: Llm | null,
  category: unknown,
  opts: NewJokeOptions,
): Promise<{ joke: ToldJoke; source: JokeSource }> {
  const now = opts.now ?? new Date();
  const random = opts.random ?? Math.random;
  const pick: CategoryKey =
    typeof category === 'string' && isCategory(category)
      ? category
      : CATEGORY_KEYS[Math.floor(random() * CATEGORY_KEYS.length)]!;
  const recent = await repo.recentSetups(AVOID_COUNT);

  let source: JokeSource = 'library-no-llm';
  let written: { setup: string; punchline: string } | null = null;
  if (llm) {
    const calls = await repo.bumpAiCalls(now.toISOString().slice(0, 10));
    if (calls > opts.dailyCap) source = 'library-cap';
    else {
      try {
        written = parseJokeReply(
          await llm.joke(JOKE_SYSTEM, jokeUserMessage(CATEGORIES[pick].topic, recent)),
        );
        source = written ? 'ai' : 'library-bad-reply';
      } catch {
        source = 'library-llm-error';
      }
    }
  }
  const base = written
    ? { key: 'ai', category: pick, ...written }
    : generateJoke(pick, new Set(recent), random);
  const joke: ToldJoke = {
    id: ulid(),
    ...base,
    level: null,
    score: null,
    toldAt: now.toISOString(),
  };
  await repo.addJoke(joke);
  return { joke, source };
}

export async function rateJoke(repo: Repo, id: unknown, levelKey: unknown): Promise<void> {
  if (typeof id !== 'string' || !ULID_RE.test(id)) throw new NotFound('no such joke');
  const level = typeof levelKey === 'string' ? levelByKey(levelKey) : undefined;
  if (!level) throw new BadInput('unknown groan level');
  const result = await repo.rateJoke(id, level);
  if (result === 'missing') throw new NotFound('no such joke');
  if (result === 'already') throw new Conflict('already rated');
}

export const board = (repo: Repo): Promise<Board> => repo.board(BOARD_SIZE);
