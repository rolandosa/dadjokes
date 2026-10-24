import type { GroanLevel } from '@dadjokes/core/jokes';
import type { Repo } from '@dadjokes/core/ports';
import type { Board, Persona, ToldJoke } from '@dadjokes/core/types';

/** What every persona shares in DynamoRepo too: model calls, external claims, fingerprints. */
interface Shared {
  aiCalls: Map<string, number>;
  usedExternal: Set<string>;
  seen: Set<string>;
}

/**
 * In-process storage with DynamoRepo's behaviour, for `pnpm dev` and unit tests: one Repo per
 * persona, sharing what DynamoRepo shares.
 */
export function memoryStore(): { repoFor(persona: Persona): Repo } {
  const shared: Shared = { aiCalls: new Map(), usedExternal: new Set(), seen: new Set() };
  const repos = new Map<Persona, Repo>();
  return {
    repoFor(persona) {
      if (!repos.has(persona)) repos.set(persona, personaRepo(shared));
      return repos.get(persona)!;
    },
  };
}

/** A fresh store's Dad repo. */
export const memoryRepo = (): Repo => memoryStore().repoFor('dad');

function personaRepo({ aiCalls, usedExternal, seen }: Shared): Repo {
  const jokes = new Map<string, ToldJoke>();
  // DynamoRepo's STATS counters for encores.
  let bank = 0;
  let sinceReuse: number | undefined;
  const byId = () => [...jokes.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  return {
    async addJoke(joke) {
      if (jokes.has(joke.id)) throw new Error('duplicate id');
      jokes.set(joke.id, { ...joke });
      if (!joke.reusedFrom) {
        bank += 1;
        sinceReuse = (sinceReuse ?? 0) + 1;
      }
    },
    async claimReuse(minBank: number, gap: number) {
      if (bank <= minBank || (sinceReuse !== undefined && sinceReuse < gap)) return false;
      sinceReuse = 0;
      return true;
    },
    async oldestId() {
      return byId()[0]?.id ?? null;
    },
    async originalsFrom(fromId: string, limit: number) {
      return byId()
        .filter((j) => j.id >= fromId)
        .slice(0, limit)
        .filter((j) => !j.reusedFrom)
        .map((j) => ({ ...j }));
    },
    async rateJoke(id: string, level: GroanLevel) {
      const joke = jokes.get(id);
      if (!joke) return 'missing';
      if (joke.score != null) return 'already';
      joke.level = level.key;
      joke.score = level.score;
      return 'rated';
    },
    async changeRating(id: string, level: GroanLevel) {
      const joke = jokes.get(id);
      if (!joke) return 'missing';
      if (joke.score == null) return 'unrated';
      joke.level = level.key;
      joke.score = level.score;
      return 'changed';
    },
    async board(limit: number): Promise<Board> {
      const all = [...jokes.values()].sort((a, b) => (a.id < b.id ? 1 : -1));
      const rated = all.filter((j) => j.score != null);
      const top = [...rated].sort((a, b) => b.score! - a.score! || (a.id < b.id ? 1 : -1));
      const groans = rated.reduce((n, j) => n + j.score!, 0);
      return {
        top: top.slice(0, limit).map((j) => ({ ...j })),
        recent: all.slice(0, limit).map((j) => ({ ...j })),
        stats: {
          told: all.length,
          rated: rated.length,
          avg: rated.length ? groans / rated.length : 0,
        },
      };
    },
    async recentSetups(limit: number) {
      return [...jokes.values()]
        .sort((a, b) => (a.id < b.id ? 1 : -1))
        .slice(0, limit)
        .map((j) => j.setup);
    },
    async claimExternal(key: string) {
      if (usedExternal.has(key)) return false;
      usedExternal.add(key);
      return true;
    },
    async claimFingerprints(keys: readonly string[]) {
      if (keys.some((k) => seen.has(k))) return false;
      keys.forEach((k) => seen.add(k));
      return true;
    },
    async bumpAiCalls(day: string) {
      const n = (aiCalls.get(day) ?? 0) + 1;
      aiCalls.set(day, n);
      return n;
    },
  };
}
