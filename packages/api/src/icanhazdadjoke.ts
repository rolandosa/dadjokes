import type { ExternalJoke } from '@dadjokes/core/external';
import type { ExternalJokes } from '@dadjokes/core/ports';

/**
 * icanhazdadjoke.com (SPEC "External jokes"): a free, public collection of dad jokes. Its API
 * asks callers to send a User-Agent that says who they are. A slow answer is abandoned, and
 * the joke is written by the model instead.
 */
const BASE = 'https://icanhazdadjoke.com';
const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Dad-O-Matic 3000 (https://github.com/rolandosa/dadjokes)',
};
const TIMEOUT_MS = 2500;
const PAGE_SIZE = 30;

interface Joke {
  id: unknown;
  joke: unknown;
}

const toJoke = (j: Joke): ExternalJoke | null =>
  typeof j.id === 'string' && typeof j.joke === 'string' ? { id: j.id, text: j.joke } : null;

async function get(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`icanhazdadjoke ${res.status}`);
  return res.json();
}

export function icanhazdadjoke(random: () => number = Math.random): ExternalJokes {
  return {
    async find(term) {
      if (term === null) {
        const one = toJoke((await get('/')) as Joke);
        return one ? [one] : [];
      }
      const q = (page: number) =>
        `/search?term=${encodeURIComponent(term)}&limit=${PAGE_SIZE}&page=${page}`;
      let body = (await get(q(1))) as { results?: Joke[]; total_pages?: number };
      // A random page, so the same search does not always offer the same jokes.
      const pages = Number(body.total_pages ?? 1);
      if (pages > 1) {
        const page = 1 + Math.floor(random() * pages);
        if (page > 1) body = (await get(q(page))) as typeof body;
      }
      return (body.results ?? []).map(toJoke).filter((j): j is ExternalJoke => j !== null);
    },
  };
}
