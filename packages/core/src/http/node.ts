import type { IncomingMessage, ServerResponse } from 'node:http';
import type { FnUrlEvent, FnUrlResult } from './event.js';

/** Build a function-URL event from a Node request the local dev server received. */
export function nodeToEvent(req: IncomingMessage, body: string): FnUrlEvent {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const headers: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    headers[k.toLowerCase()] = Array.isArray(v) ? v.join(',') : v;
  }
  return {
    version: '2.0',
    rawPath: url.pathname,
    rawQueryString: url.searchParams.toString(),
    headers,
    body: body.length > 0 ? body : undefined,
    isBase64Encoded: false,
    requestContext: {
      http: {
        method: (req.method ?? 'GET').toUpperCase(),
        path: url.pathname,
        sourceIp: req.socket.remoteAddress ?? '127.0.0.1',
      },
      requestId: Math.random().toString(36).slice(2),
    },
  };
}

export function writeResult(res: ServerResponse, result: FnUrlResult): void {
  res.writeHead(result.statusCode, result.headers ?? {});
  if (result.body) {
    res.end(result.isBase64Encoded ? Buffer.from(result.body, 'base64') : result.body);
  } else {
    res.end();
  }
}
