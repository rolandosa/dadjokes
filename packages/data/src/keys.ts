import { ULID_RE } from '@dadjokes/core/ids';
import type { Persona } from '@dadjokes/core/types';

/**
 * The only module that builds key strings (SPEC "Data model").
 *
 * - FEED / J#<id>: every told joke; ids are ULIDs, so the newest sort last.
 * - TOP / <score>#<id>: a copy of each rated joke, sorted by score then age.
 * - STATS / STATS: running counts for the header.
 *   Mom mode has her own three: MOM#FEED, MOM#TOP and STATS / MOM (see `partitions`).
 *   EXT, SEEN and the AI# counter are shared, so neither persona repeats the other.
 * - STATS / AI#<YYYY-MM-DD>: model calls that day, for the daily cap.
 * - EXT / <key>: an external joke already told, so it is not told again.
 * - SEEN / <fingerprint>: a setup or punchline already told (core/src/fingerprint.ts).
 */
export const FEED = 'FEED';
export const TOP = 'TOP';
export const STATS = 'STATS';
export const EXT = 'EXT';
export const SEEN = 'SEEN';

/** The persona's own partitions; Dad keeps the original names, so his data never moved. */
export function partitions(persona: Persona): { feed: string; top: string; statsSk: string } {
  return persona === 'mom'
    ? { feed: 'MOM#FEED', top: 'MOM#TOP', statsSk: 'MOM' }
    : { feed: FEED, top: TOP, statsSk: STATS };
}

function checkId(id: string): string {
  if (!ULID_RE.test(id)) throw new RangeError('joke id must be a ULID');
  return id;
}

export const feedSk = (id: string): string => `J#${checkId(id)}`;
export const topSk = (score: number, id: string): string => `${score}#${checkId(id)}`;

export const aiCallsSk = (day: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new RangeError('day must be YYYY-MM-DD');
  return `AI#${day}`;
};
