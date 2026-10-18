import { decodeTime, encodeTime, ulid as rawUlid } from 'ulid';

/**
 * Crockford base32 ULID shape: 26 chars, no I/L/O/U. It contains no '#', which
 * every sort key in the data layer uses as its separator, so an id can never
 * add a key segment.
 */
export const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/** Time-sortable 26-char id: told jokes sort newest-first by id alone. */
export function ulid(): string {
  return rawUlid();
}

/** The smallest ULID for millisecond `ms`: every id minted at or after `ms` sorts at or above it. */
export const ulidFloor = (ms: number): string => encodeTime(ms, 10) + '0'.repeat(16);

/** When a ULID was minted, in epoch milliseconds. */
export const ulidTime = (id: string): number => decodeTime(id);
