import { checkJoke } from './prompts/joke.js';

/**
 * External jokes (SPEC "External jokes"): a collection of existing dad jokes, today
 * icanhazdadjoke.com. Each joke is one string, split here into setup and punchline.
 */

/** A joke as the collection returns it. */
export interface ExternalJoke {
  id: string;
  text: string;
}

/**
 * Splits "Why did X? Because Y." at the first question mark; otherwise at the first sentence
 * end ("I used to X. Then Y."). Null when there is no sensible split or a part breaks the
 * length and word rules every joke on the page follows.
 */
export function splitJoke(text: string): { setup: string; punchline: string } | null {
  const t = text.replace(/\s+/g, ' ').trim();
  const strip = (s: string) => s.replace(/^[\s\-–—:"']+/, '').trim();
  const q = t.indexOf('?');
  if (q > 0 && q < t.length - 2) return checkJoke(t.slice(0, q + 1), strip(t.slice(q + 1)));
  const m = /^(.+?[.!…])\s+(\S.*)$/.exec(t);
  if (m) return checkJoke(m[1]!, strip(m[2]!));
  return null;
}

/** `ext:<source>:<id>`: the key a stored external joke carries. */
export const externalKey = (id: string): string => `ext:icanhazdadjoke:${id}`;
export const isExternalKey = (key: string): boolean => key.startsWith('ext:');
