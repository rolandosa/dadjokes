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
  /** Adds one to the count of model calls on `day` (YYYY-MM-DD) and returns the new count. */
  bumpAiCalls(day: string): Promise<number>;
}

/** The joke writer (packages/api/src/bedrock.ts, or a fixture for local and tests). Returns raw text. */
export interface Llm {
  joke(system: string, user: string): Promise<string>;
}
