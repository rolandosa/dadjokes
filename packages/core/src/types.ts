import type { CategoryKey, GroanKey } from './jokes.js';

/** A joke as it was told and (maybe) rated. `level` and `score` are null until someone rates it. */
export interface ToldJoke {
  id: string;
  /** `<category>:<index>` for a library joke, `ai` for one the model wrote. */
  key: string;
  category: CategoryKey;
  setup: string;
  punchline: string;
  level: GroanKey | null;
  score: number | null;
  toldAt: string;
  /** For an encore (a reused joke), the id of the joke it repeats; null for an original. */
  reusedFrom: string | null;
}

export interface Stats {
  told: number;
  rated: number;
  /** Mean groan score of the rated jokes, 0 when none are rated. */
  avg: number;
}

/** What the Hall of Groans and Fresh Off the Grill lists show. */
export interface Board {
  top: ToldJoke[];
  recent: ToldJoke[];
  stats: Stats;
}
