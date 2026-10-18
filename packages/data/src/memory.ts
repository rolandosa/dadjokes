import type { GroanLevel } from '@dadjokes/core/jokes';
import type { Repo } from '@dadjokes/core/ports';
import type { Board, ToldJoke } from '@dadjokes/core/types';

/** An in-process Repo with DynamoRepo's behaviour, for `pnpm dev` and unit tests. */
export function memoryRepo(): Repo {
  const jokes = new Map<string, ToldJoke>();
  const aiCalls = new Map<string, number>();
  return {
    async addJoke(joke) {
      if (jokes.has(joke.id)) throw new Error('duplicate id');
      jokes.set(joke.id, { ...joke });
    },
    async rateJoke(id: string, level: GroanLevel) {
      const joke = jokes.get(id);
      if (!joke) return 'missing';
      if (joke.score != null) return 'already';
      joke.level = level.key;
      joke.score = level.score;
      return 'rated';
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
    async bumpAiCalls(day: string) {
      const n = (aiCalls.get(day) ?? 0) + 1;
      aiCalls.set(day, n);
      return n;
    },
  };
}
