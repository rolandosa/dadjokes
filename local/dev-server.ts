import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { FnUrlEvent, FnUrlResult } from '@dadjokes/core/http';
import { nodeToEvent, writeResult } from '@dadjokes/core/http/node';
import type { Llm } from '@dadjokes/core/ports';
import { handler, setLlm, setRepo } from '@dadjokes/api';
import { memoryRepo } from '@dadjokes/data/memory';

/**
 * `pnpm dev` (SPEC "Local"): fn-api on API_PORT behind a Node server; the site's Vite
 * server proxies /api here. STORE=memory (the default) needs no Docker; STORE=dynamodb
 * uses DynamoDB Local (`pnpm local:tables` first). LLM_MODE=fixture (the default) answers
 * with canned jokes; LLM_MODE=bedrock calls JOKE_MODEL through the local AWS credentials.
 */

const apiPort = Number(process.env.API_PORT ?? 8807);

if ((process.env.STORE ?? 'memory') === 'memory') {
  setRepo(memoryRepo());
  console.log('STORE=memory: jokes last until this server stops.');
}

if (process.env.LLM_MODE !== 'bedrock') {
  setLlm(fixtureWriter());
  console.log('LLM_MODE=fixture: canned jokes. LLM_MODE=bedrock writes real ones.');
}

/** Canned replies in rotation, one of them broken so the library fallback shows up too. */
function fixtureWriter(): Llm {
  const replies = [
    '{"setup": "Why did the fixture refuse to change?", "punchline": "It was set in its ways."}',
    '{"setup": "What do you call a test that always passes?", "punchline": "A green thumb."}',
    'not json, so this one comes from the library',
  ];
  let n = 0;
  return {
    async joke() {
      await new Promise((r) => setTimeout(r, 400));
      return replies[n++ % replies.length]!;
    },
  };
}

function serve(port: number, name: string, handle: (e: FnUrlEvent) => Promise<FnUrlResult>) {
  createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const event = nodeToEvent(req, Buffer.concat(chunks).toString('utf8'));
      handle(event)
        .then((result) => writeResult(res, result))
        .catch((err: unknown) => {
          console.error(err);
          writeResult(res, { statusCode: 500, body: '' });
        });
    });
  }).listen(port, '0.0.0.0', () => console.log(`${name} on http://localhost:${port}`));
}

serve(apiPort, 'fn-api', handler);
