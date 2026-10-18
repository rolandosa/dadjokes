export interface FnUrlEvent {
  version: '2.0';
  rawPath: string;
  rawQueryString: string;
  headers: Record<string, string | undefined>;
  body?: string | undefined;
  isBase64Encoded: boolean;
  requestContext: {
    http: { method: string; path: string; sourceIp: string };
    requestId: string;
  };
}

export interface FnUrlResult {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
}

/** Every request body is a tiny JSON object; anything bigger is refused unread. */
export const MAX_BODY_BYTES = 4 * 1024;

/** The deployed commit, reported by `/api/healthz`. */
export const GIT_SHA = process.env.GIT_SHA ?? 'dev';

export function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): FnUrlResult {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  };
}

export function text(status: number, body = ''): FnUrlResult {
  return { statusCode: status, headers: { 'content-type': 'text/plain' }, body };
}

/**
 * SPEC `/api/healthz`: carries the deployed commit.
 * GET only (H-7); any other method answers 405 with `allow: GET` and an empty
 * body.
 *
 * Callers must match the path EXACTLY and before their route table, so
 * `/healthz/anything` still 404s rather than answering 200 as a prefix match.
 */
export function healthz(method: string): FnUrlResult {
  if (method !== 'GET') return { statusCode: 405, headers: { allow: 'GET' }, body: '' };
  return json(200, { ok: true, version: GIT_SHA });
}

export function readBody(event: FnUrlEvent): string {
  if (!event.body) return '';
  return event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
}

export function tooLarge(event: FnUrlEvent, max = MAX_BODY_BYTES): boolean {
  if (!event.body) return false;
  const bytes = event.isBase64Encoded
    ? Math.floor((event.body.length * 3) / 4)
    : Buffer.byteLength(event.body, 'utf8');
  return bytes > max;
}

export interface RouteDef {
  readonly method: string;
  /** Exact segments, or `{name}` for one non-empty path parameter (`/api/jokes/{id}/rating`). */
  readonly path: string;
  readonly name: string;
}

export interface RouteMatch {
  name: string;
  query: URLSearchParams;
  /** The `{name}` segments of the matched path, URL-decoded; empty for a path with none. */
  params: Record<string, string>;
}

/** The params of `pattern` in `path`, or null when they do not match segment for segment. */
function matchPath(pattern: string, path: string): Record<string, string> | null {
  const want = pattern.split('/');
  const got = path.split('/');
  if (want.length !== got.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i++) {
    const w = want[i]!;
    const g = got[i]!;
    const name = /^\{(\w+)\}$/.exec(w)?.[1];
    if (name === undefined) {
      if (w !== g) return null;
      continue;
    }
    if (g === '') return null;
    try {
      params[name] = decodeURIComponent(g);
    } catch {
      // A malformed escape matches no route (a 404), rather than throwing.
      return null;
    }
  }
  return params;
}

export function route(event: FnUrlEvent, routes: readonly RouteDef[]): RouteMatch | null {
  const method = event.requestContext.http.method.toUpperCase();
  const path = event.rawPath.replace(/\/+$/, '') || '/';
  for (const r of routes) {
    if (r.method !== method) continue;
    const params = matchPath(r.path.replace(/\/+$/, '') || '/', path);
    if (!params) continue;
    return { name: r.name, query: new URLSearchParams(event.rawQueryString ?? ''), params };
  }
  return null;
}
