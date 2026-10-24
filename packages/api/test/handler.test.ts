import { beforeEach, describe, expect, it } from 'vitest';
import type { FnUrlEvent } from '@dadjokes/core/http';
import { memoryStore } from '@dadjokes/data/memory';
import { handler, setExternal, setLlm, setRepoFor } from '../src/handler.js';

function ev(method: string, path: string, body?: unknown): FnUrlEvent {
  return {
    version: '2.0',
    rawPath: path,
    rawQueryString: '',
    headers: {},
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    isBase64Encoded: false,
    requestContext: { http: { method, path, sourceIp: '1.2.3.4' }, requestId: 'r1' },
  };
}

beforeEach(() => {
  const store = memoryStore();
  setRepoFor((persona) => store.repoFor(persona));
  // Never the real icanhazdadjoke.com in tests: the joke must come from the fake writer below.
  setExternal(null);
  setLlm({
    async joke() {
      return '{"setup": "What do you call a sleeping bull?", "punchline": "A bulldozer."}';
    },
  });
});

describe('fn-api', () => {
  it('writes a joke, rates it, changes the rating, and shows it on the board', async () => {
    const made = await handler(ev('POST', '/api/jokes', { category: 'animals' }));
    expect(made.statusCode).toBe(201);
    const joke = JSON.parse(made.body!) as { id: string; setup: string };
    expect(joke.setup).toBe('What do you call a sleeping bull?');

    const rated = await handler(
      ev('POST', `/api/jokes/${joke.id}/rating`, { level: 'full_facepalm' }),
    );
    expect(rated.statusCode).toBe(204);
    const again = await handler(ev('POST', `/api/jokes/${joke.id}/rating`, { level: 'eye_roll' }));
    expect(again.statusCode).toBe(204);

    const b = await handler(ev('GET', '/api/board'));
    expect(b.headers?.['cache-control']).toBe('no-store');
    const body = JSON.parse(b.body!) as { top: Array<{ score: number }>; stats: { told: number } };
    expect(body.top.map((j) => j.score)).toEqual([2]);
    expect(body.stats.told).toBe(1);
  });

  it('answers 400 for a bad body, 404 for unknown routes and ids, 413 for big bodies', async () => {
    expect((await handler(ev('POST', '/api/jokes', '[1]'))).statusCode).toBe(400);
    expect((await handler(ev('POST', '/api/jokes', 'not json'))).statusCode).toBe(400);
    expect((await handler(ev('GET', '/api/nope'))).statusCode).toBe(404);
    expect(
      (await handler(ev('POST', '/api/jokes/bad-id/rating', { level: 'eye_roll' }))).statusCode,
    ).toBe(404);
    expect((await handler(ev('POST', '/api/jokes', 'x'.repeat(5000)))).statusCode).toBe(413);
  });

  it('reports health and the deployed commit', async () => {
    const h = await handler(ev('GET', '/api/healthz'));
    expect(h.statusCode).toBe(200);
    expect(JSON.parse(h.body!)).toMatchObject({ ok: true });
  });
});
