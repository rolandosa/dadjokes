import { App } from 'aws-cdk-lib';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_JOKE_MODEL, DadJokesStack } from '../lib/dadjokes-stack.js';

const app = new App();
const gitSha =
  process.env.GIT_SHA ?? execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
// The site is built before synth (`pnpm aws:synth` and `pnpm aws:deploy` do it first).
const webDist = fileURLToPath(new URL('../../packages/web/dist/', import.meta.url));
if (!existsSync(`${webDist}index.html`)) {
  throw new Error(
    `${webDist}index.html is missing: build the site first (pnpm --filter @dadjokes/web build), ` +
      'or use pnpm aws:synth / pnpm aws:deploy, which build it.',
  );
}
const ctx = (name: string): string | undefined => {
  const v: unknown = app.node.tryGetContext(name);
  return v === undefined ? undefined : String(v).trim() || undefined;
};

new DadJokesStack(app, 'DadJokes', {
  // Pantry's and OurToDos' region: same account, same Bedrock profiles.
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-2' },
  gitSha,
  webDist,
  jokeModel: ctx('jokeModel') ?? DEFAULT_JOKE_MODEL,
  aiDailyCap: Number(ctx('aiDailyCap') ?? 500),
  externalShare: Number(ctx('externalShare') ?? 0.4),
});
