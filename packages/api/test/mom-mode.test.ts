import { beforeEach, describe, expect, it } from 'vitest';
import type { FnUrlEvent } from '@dadjokes/core/http';
import { memoryStore } from '@dadjokes/data/memory';
import { handler, setExternal, setLlm, setRepoFor } from '../src/handler.js';

function ev(method: string, path: string, body?: unknown, query = ''): FnUrlEvent {
  return {
    version: '2.0',
    rawPath: path,
    rawQueryString: query,
    headers: {},
    body: body === undefined ? undefined : JSON.stringify(body),
    isBase64Encoded: false,
    requestContext: { http: { method, path, sourceIp: '1.2.3.4' }, requestId: 'r1' },
  };
}
const call = async (method: string, path: string, body?: unknown, query = '') => {
  const r = await handler(ev(method, path, body, query));
  return {
    status: r.statusCode,
    body: r.body ? (JSON.parse(r.body) as Record<string, unknown>) : null,
  };
};

let systems: string[] = [];
beforeEach(() => {
  const store = memoryStore();
  setRepoFor((persona) => store.repoFor(persona));
  setExternal(null);
  systems = [];
  let n = 0;
  setLlm({
    async joke(system) {
      systems.push(system);
      n += 1;
      return JSON.stringify({
        jokes: [{ setup: `Why did joke number ${n} happen?`, punchline: `Reason ${n}.` }],
      });
    },
  });
});

describe('Mom mode', () => {
  it("writes with the Mom prompt and keeps her jokes off Dad's board", async () => {
    const mom = await call('POST', '/api/jokes', { category: 'food', persona: 'mom' });
    expect(mom.status).toBe(201);
    expect(systems[0]).toMatch(/mom jokes for the Mom-O-Matic/);
    const dad = await call('POST', '/api/jokes', { category: 'food' });
    expect(systems[1]).toMatch(/dad jokes for the Dad-O-Matic/);

    const momBoard = await call('GET', '/api/board', undefined, 'persona=mom');
    const dadBoard = await call('GET', '/api/board');
    const ids = (b: typeof momBoard) => (b.body!.recent as Array<{ id: string }>).map((j) => j.id);
    expect(ids(momBoard)).toEqual([mom.body!.id]);
    expect(ids(dadBoard)).toEqual([dad.body!.id]);
    expect((momBoard.body!.stats as { told: number }).told).toBe(1);
  });

  it('rates a Mom joke only through Mom mode', async () => {
    const mom = await call('POST', '/api/jokes', { category: 'food', persona: 'mom' });
    const wrong = await call('POST', `/api/jokes/${String(mom.body!.id)}/rating`, {
      level: 'eye_roll',
    });
    expect(wrong.status).toBe(404);
    const right = await call('POST', `/api/jokes/${String(mom.body!.id)}/rating`, {
      level: 'eye_roll',
      persona: 'mom',
    });
    expect(right.status).toBe(204);
    const momBoard = await call('GET', '/api/board', undefined, 'persona=mom');
    expect((momBoard.body!.stats as { rated: number }).rated).toBe(1);
  });

  it('never lets Mom repeat a joke Dad told', async () => {
    setLlm({
      async joke() {
        return JSON.stringify({
          jokes: [
            {
              setup: 'Why did the scarecrow win a Nobel Prize?',
              punchline: 'He was outstanding in his field.',
            },
          ],
        });
      },
    });
    const dad = await call('POST', '/api/jokes', { category: 'science' });
    const mom = await call('POST', '/api/jokes', { category: 'science', persona: 'mom' });
    expect(dad.body!.setup).toBe('Why did the scarecrow win a Nobel Prize?');
    expect(mom.body!.setup).not.toBe('Why did the scarecrow win a Nobel Prize?');
  });

  it('treats an unknown persona as Dad', async () => {
    await call('POST', '/api/jokes', { category: 'food', persona: 'grandpa' });
    expect(systems[0]).toMatch(/Dad-O-Matic/);
  });
});
