import { GIT_SHA, healthz, json, readBody, route, text, tooLarge } from '@dadjokes/core/http';
import type { FnUrlEvent, FnUrlResult, RouteDef } from '@dadjokes/core/http';
import { errName, log } from '@dadjokes/core/log';
import { SITE_CATEGORIES } from '@dadjokes/core/jokes';
import type { ExternalJokes, Llm, Repo } from '@dadjokes/core/ports';
import { BadInput, Conflict, NotFound, board, newJoke, rateJoke } from '@dadjokes/core/service';
import { DynamoRepo } from '@dadjokes/data/repo';
import { sharedClient, tableName } from '@dadjokes/data/client';
import { bedrockLlm } from './bedrock.js';
import { icanhazdadjoke } from './icanhazdadjoke.js';

/**
 * fn-api (SPEC "API"). Public: no login, no token. CloudFront serves it under the site's
 * own origin at /api/*, so the browser needs no CORS. A visitor can only ask for a new joke
 * (written by the model, or from the library) and rate a joke once; joke text never comes
 * from the request.
 */

const ROUTES: readonly RouteDef[] = [
  { method: 'GET', path: '/api/board', name: 'board' },
  { method: 'POST', path: '/api/jokes', name: 'new' },
  { method: 'POST', path: '/api/jokes/{id}/rating', name: 'rate' },
];

const NO_STORE = { 'cache-control': 'no-store' };

let repo: Repo | undefined;
/** Swaps the store (memory for `pnpm dev` and tests). */
export function setRepo(r: Repo): void {
  repo = r;
}
const getRepo = (): Repo => (repo ??= new DynamoRepo(sharedClient(), tableName()));

let llm: Llm | null | undefined;
/** Swaps the joke writer; null means library jokes only (`pnpm dev` without Bedrock). */
export function setLlm(l: Llm | null): void {
  llm = l;
}
const getLlm = (): Llm | null => (llm === undefined ? (llm = bedrockLlm()) : llm);

/** Model calls per UTC day before the lever falls back to library jokes (a cost backstop). */
const dailyCap = (): number => Number(process.env.AI_DAILY_CAP ?? 500);

let external: ExternalJokes | null | undefined;
/** Swaps the external joke collection; null turns external jokes off. */
export function setExternal(e: ExternalJokes | null): void {
  external = e;
}
const getExternal = (): ExternalJokes | null =>
  external === undefined ? (external = icanhazdadjoke()) : external;

/** Share of new jokes taken from the external collection, 0 to 1 (SPEC "External jokes"). */
const externalShare = (): number =>
  Math.min(1, Math.max(0, Number(process.env.EXTERNAL_SHARE ?? 0.4)));

function parse(event: FnUrlEvent): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(readBody(event) || '{}');
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  } catch {
    // Falls through to the 400 below.
  }
  throw new BadInput('body must be a JSON object');
}

async function dispatch(event: FnUrlEvent, name: string, params: Record<string, string>) {
  switch (name) {
    case 'board':
      return json(200, await board(getRepo(), SITE_CATEGORIES), NO_STORE);
    case 'new': {
      const { joke, source } = await newJoke(getRepo(), getLlm(), parse(event).category, {
        dailyCap: dailyCap(),
        categories: SITE_CATEGORIES,
        external: getExternal(),
        externalShare: externalShare(),
      });
      log({ fn: 'api', outcome: `joke-${source}` });
      return json(201, joke, NO_STORE);
    }
    case 'rate':
      await rateJoke(getRepo(), params.id, parse(event).level);
      return { statusCode: 204, headers: NO_STORE };
    default:
      return text(404);
  }
}

export async function handler(event: FnUrlEvent): Promise<FnUrlResult> {
  const started = Date.now();
  const method = event.requestContext.http.method.toUpperCase();
  const reqId = event.requestContext.requestId;
  const path = event.rawPath.replace(/\/+$/, '');
  if (path === '/api/healthz') return healthz(method);

  const match = route(event, ROUTES);
  let result: FnUrlResult;
  let err: string | undefined;
  if (!match) result = text(404);
  else if (tooLarge(event)) result = text(413);
  else {
    try {
      result = await dispatch(event, match.name, match.params);
    } catch (e) {
      err = errName(e);
      if (e instanceof BadInput) result = json(400, { error: e.message });
      else if (e instanceof NotFound) result = json(404, { error: e.message });
      else if (e instanceof Conflict) result = json(409, { error: e.message });
      else result = json(500, { error: 'something went wrong' });
    }
  }
  log({
    fn: 'api',
    route: match?.name ?? 'none',
    status: result.statusCode,
    ms: Date.now() - started,
    reqId,
    err,
  });
  return result;
}

export { GIT_SHA };
