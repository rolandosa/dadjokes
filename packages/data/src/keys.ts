import { ULID_RE } from '@dadjokes/core/ids';

/**
 * The only module that builds key strings (SPEC "Data model").
 *
 * - FEED / J#<id>: every told joke; ids are ULIDs, so the newest sort last.
 * - TOP / <score>#<id>: a copy of each rated joke, sorted by score then age.
 * - STATS / STATS: running counts for the header.
 * - STATS / AI#<YYYY-MM-DD>: model calls that day, for the daily cap.
 */
export const FEED = 'FEED';
export const TOP = 'TOP';
export const STATS = 'STATS';

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
