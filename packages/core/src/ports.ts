import type { ExternalJoke } from './external.js';
import type { GroanLevel } from './jokes.js';
import type { Board, ToldJoke } from './types.js';

/** Storage for told jokes (packages/data: DynamoDB, or memory for local and tests). */
export interface Repo {
  /** Stores a newly told joke and counts it. */
  addJoke(joke: ToldJoke): Promise<void>;
  /**
   * Rates a joke once. Returns 'missing' for an unknown id and 'already' when it was rated
   * before; a joke's rating never changes.
   */
  rateJoke(id: string, level: GroanLevel): Promise<'rated' | 'missing' | 'already'>;
  board(limit: number): Promise<Board>;
  /** Setups of the most recently told jokes, newest first. */
  recentSetups(limit: number): Promise<string[]>;
  /**
   * Takes the one encore slot if it is open: the bank (original jokes stored) holds more than
   * `minBank` jokes and at least `gap` originals were told since the last encore. Atomic, so
   * two visitors pulling at once cannot both get an encore. Returns whether it was taken.
   */
  claimReuse(minBank: number, gap: number): Promise<boolean>;
  /** The id of the first joke ever told, or null when none is stored. */
  oldestId(): Promise<string | null>;
  /** Up to `limit` original (not reused) jokes with ids at or after `fromId`, oldest first. */
  originalsFrom(fromId: string, limit: number): Promise<ToldJoke[]>;
  /**
   * Marks an external joke as used. True the first time for a given id, false after, so an
   * external joke is told once (encores aside).
   */
  claimExternal(key: string): Promise<boolean>;
  /** Adds one to the count of model calls on `day` (YYYY-MM-DD) and returns the new count. */
  bumpAiCalls(day: string): Promise<number>;
}

/** An external joke collection (packages/api/src/icanhazdadjoke.ts, or a fixture). */
export interface ExternalJokes {
  /** A random joke when `term` is null, else jokes containing the word. */
  find(term: string | null): Promise<ExternalJoke[]>;
}

/** The joke writer (packages/api/src/bedrock.ts, or a fixture for local and tests). Returns raw text. */
export interface Llm {
  joke(system: string, user: string): Promise<string>;
}
