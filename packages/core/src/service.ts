import { ULID_RE, ulid, ulidFloor, ulidTime } from './ids.js';
import { CATEGORIES, CATEGORY_KEYS, allJokes, generateJoke, levelByKey } from './jokes.js';
import type { CategoryKey } from './jokes.js';
import { externalKey, splitJoke } from './external.js';
import type { ExternalJokes, Llm, Repo } from './ports.js';
import { fingerprints } from './fingerprint.js';
import { jokeSystem, jokeUserMessage, parseJokeReplies } from './prompts/joke.js';
import type { Board, Persona, ToldJoke } from './types.js';

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

/** How many recent setups the model is asked not to repeat, and an encore must avoid. */
const AVOID_COUNT = 20;

/**
 * Encores (SPEC "Encores"): once the bank holds more than REUSE_MIN_BANK original jokes, a
 * stored joke may be told again, but only after REUSE_GAP originals since the last encore.
 * So never two in a row, and at most one in any ten consecutive jokes.
 */
export const REUSE_MIN_BANK = 200;
export const REUSE_GAP = 9;

/**
 * How many neighbouring bank jokes one encore draw looks at, and how many random draws it
 * tries before a last draw from the oldest jokes (random points near "now" land among the
 * recent jokes it must avoid).
 */
const DRAW_SIZE = 25;
const DRAWS = 3;

/**
 * A stored original for an encore: from a random point in the bank's history, the best-rated
 * joke nearby that fits the category and was not told recently. Null when no draw finds one.
 */
async function pickEncore(
  repo: Repo,
  category: CategoryKey,
  anyCategory: boolean,
  allowed: readonly CategoryKey[],
  avoid: ReadonlySet<string>,
  now: Date,
  random: () => number,
): Promise<ToldJoke | null> {
  const oldest = await repo.oldestId();
  if (!oldest) return null;
  const from = ulidTime(oldest);
  for (let i = 0; i <= DRAWS; i++) {
    const at = i === DRAWS ? from : from + Math.floor(random() * Math.max(1, now.getTime() - from));
    const fits = (await repo.originalsFrom(ulidFloor(at), DRAW_SIZE)).filter(
      (j) =>
        !avoid.has(j.setup) &&
        allowed.includes(j.category) &&
        (anyCategory || j.category === category),
    );
    if (!fits.length) continue;
    const best = Math.max(...fits.map((j) => j.score ?? 0));
    const top = fits.filter((j) => (j.score ?? 0) === best);
    return top[Math.floor(random() * top.length)]!;
  }
  return null;
}

export interface NewJokeOptions {
  /** Model calls allowed per UTC day; past it, jokes come from the library. */
  dailyCap: number;
  /** The external collection, and the share of new jokes to take from it (0 to 1). */
  external?: ExternalJokes | null;
  externalShare?: number;
  /** Categories this caller offers; a request for any other is treated as "Surprise me". */
  categories?: readonly CategoryKey[];
  /** Who tells the joke; sets the prompt (SPEC "Mom mode"). The repo is already that persona's. */
  persona?: Persona;
  now?: Date;
  random?: () => number;
}

/** Where a joke came from (an encore, the model, or the library and why), for the log line. */
export type JokeSource =
  | 'encore'
  | 'external'
  | 'external-after-repeat'
  | 'ai'
  | 'ai-retry'
  | 'library-no-llm'
  | 'library-cap'
  | 'library-bad-reply'
  | 'library-llm-error'
  | 'library-repeat';

/** Model calls per pull at most: the first, and one retry when all its jokes were told before. */
const AI_ATTEMPTS = 2;

/** An untold library joke whose fingerprints are free; any library joke when none is. */
async function fromLibrary(
  repo: Repo,
  category: CategoryKey,
  avoid: ReadonlySet<string>,
  random: () => number,
) {
  const pool = allJokes(category)
    .filter((j) => !avoid.has(j.setup))
    .sort(() => random() - 0.5);
  for (const j of pool) {
    if (await repo.claimFingerprints(fingerprints(j.setup, j.punchline))) return j;
  }
  return generateJoke(category, avoid, random);
}

/** How many external jokes one pull looks at, at most, before giving up on the collection. */
const EXTERNAL_TRIES = 5;

/**
 * An unused external joke for the category, claimed so it is not told again; null when the
 * collection fails, finds nothing usable, or every candidate was already told.
 */
async function fromExternal(
  repo: Repo,
  external: ExternalJokes,
  source: 'random' | readonly string[],
  avoid: ReadonlySet<string>,
  random: () => number,
): Promise<{ key: string; setup: string; punchline: string } | null> {
  let tries = 0;
  // A random joke comes one per call; a search returns a page to pick from.
  for (let call = 0; call < (source === 'random' ? EXTERNAL_TRIES : 1); call++) {
    const term = source === 'random' ? null : source[Math.floor(random() * source.length)]!;
    let found;
    try {
      found = await external.find(term);
    } catch {
      return null;
    }
    const shuffled = [...found].sort(() => random() - 0.5);
    for (const candidate of shuffled) {
      if (tries >= EXTERNAL_TRIES) return null;
      const joke = splitJoke(candidate.text);
      if (!joke || avoid.has(joke.setup)) continue;
      tries += 1;
      const key = externalKey(candidate.id);
      // Its id is new, but the same joke may have been told from another source.
      if (
        (await repo.claimExternal(key)) &&
        (await repo.claimFingerprints(fingerprints(joke.setup, joke.punchline)))
      )
        return { key, ...joke };
    }
  }
  return null;
}

/**
 * Tells a joke and stores it. When the encore slot is open it repeats a stored joke;
 * otherwise the model writes a new one. Falls back to an untold library joke when
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
  const allowed = opts.categories ?? CATEGORY_KEYS;
  const asked = typeof category === 'string' && (allowed as readonly string[]).includes(category);
  const pick: CategoryKey = asked
    ? (category as CategoryKey)
    : allowed[Math.floor(random() * allowed.length)]!;
  const recent = await repo.recentSetups(AVOID_COUNT);
  const toldAt = now.toISOString();

  if (await repo.claimReuse(REUSE_MIN_BANK, REUSE_GAP)) {
    const original = await pickEncore(repo, pick, !asked, allowed, new Set(recent), now, random);
    if (original) {
      const encore: ToldJoke = {
        id: ulid(),
        key: original.key,
        category: original.category,
        setup: original.setup,
        punchline: original.punchline,
        level: null,
        score: null,
        toldAt,
        reusedFrom: original.id,
      };
      await repo.addJoke(encore);
      return { joke: encore, source: 'encore' };
    }
    // No fitting joke found: the slot was spent, and a new joke is told instead.
  }

  const externalSource = CATEGORIES[pick].external;
  if (opts.external && externalSource && random() < (opts.externalShare ?? 0)) {
    const found = await fromExternal(repo, opts.external, externalSource, new Set(recent), random);
    if (found) {
      const joke: ToldJoke = {
        id: ulid(),
        ...found,
        category: pick,
        level: null,
        score: null,
        toldAt,
        reusedFrom: null,
      };
      await repo.addJoke(joke);
      return { joke, source: 'external' };
    }
  }

  let source: JokeSource = 'library-no-llm';
  let written: { setup: string; punchline: string } | null = null;
  if (llm) {
    const rejected: string[] = [];
    for (let attempt = 0; attempt < AI_ATTEMPTS && !written; attempt++) {
      const calls = await repo.bumpAiCalls(now.toISOString().slice(0, 10));
      if (calls > opts.dailyCap) {
        source = 'library-cap';
        break;
      }
      let candidates;
      try {
        const avoid = [...rejected, ...recent];
        candidates = parseJokeReplies(
          await llm.joke(jokeSystem(opts.persona), jokeUserMessage(CATEGORIES[pick].topic, avoid)),
        );
      } catch {
        source = 'library-llm-error';
        break;
      }
      if (!candidates.length) {
        source = 'library-bad-reply';
        break;
      }
      // The first candidate never told before (SPEC "No repeats").
      for (const c of candidates) {
        if (await repo.claimFingerprints(fingerprints(c.setup, c.punchline))) {
          written = c;
          break;
        }
      }
      if (written) source = attempt === 0 ? 'ai' : 'ai-retry';
      else {
        rejected.push(...candidates.map((c) => c.setup));
        source = 'library-repeat';
      }
    }
  }

  // Every joke the model offered was a repeat: try the external collection before the library.
  if (!written && source === 'library-repeat' && opts.external && externalSource) {
    const found = await fromExternal(repo, opts.external, externalSource, new Set(recent), random);
    if (found) {
      const joke: ToldJoke = {
        id: ulid(),
        ...found,
        category: pick,
        level: null,
        score: null,
        toldAt,
        reusedFrom: null,
      };
      await repo.addJoke(joke);
      return { joke, source: 'external-after-repeat' };
    }
  }

  const base = written
    ? { key: 'ai', category: pick, ...written }
    : await fromLibrary(repo, pick, new Set(recent), random);
  const joke: ToldJoke = {
    id: ulid(),
    ...base,
    level: null,
    score: null,
    toldAt,
    reusedFrom: null,
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
  if (result === 'rated') return;
  // Already rated: the visitor changed their mind (SPEC "Rating"), so move it.
  const changed = await repo.changeRating(id, level);
  if (changed === 'missing') throw new NotFound('no such joke');
  if (changed !== 'changed') throw new Conflict('the rating changed meanwhile, try again');
}

/**
 * The two lists and the stats. With `categories`, jokes from other categories are left out of
 * the lists (the stats still count every joke ever told).
 */
export async function board(repo: Repo, categories?: readonly CategoryKey[]): Promise<Board> {
  if (!categories) return repo.board(BOARD_SIZE);
  const b = await repo.board(BOARD_SIZE * 3);
  const keep = (j: ToldJoke) => categories.includes(j.category);
  return {
    ...b,
    top: b.top.filter(keep).slice(0, BOARD_SIZE),
    recent: b.recent.filter(keep).slice(0, BOARD_SIZE),
  };
}
