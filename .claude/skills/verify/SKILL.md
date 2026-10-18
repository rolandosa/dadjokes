---
name: verify
description: Run Dad-O-Matic's CI checks locally before a commit or push (format, lint, typecheck, unit tests, DynamoDB Local integration tests, CDK synth) and fix what fails. Use before every push or when asked whether CI will pass.
---

# Verify

Run in this order and fix each failure before moving on:

```sh
pnpm format:check   # pnpm format fixes it
pnpm lint
pnpm typecheck
pnpm test
pnpm test:int       # needs DynamoDB Local: docker compose -f local/docker-compose.yml up -d
pnpm aws:synth
```

- `pnpm test:int` is the only test that exercises real DynamoDB conditions. The memory repo
  cannot catch DynamoDB-only behaviour (a stored NULL is not an absent attribute), so run it
  whenever `packages/data/src/repo.ts` changes. If DynamoDB Local cannot run, say so; CI runs it.
- After a change to `packages/ui`, also run `pnpm vault:build`: the Vault page bundles the same UI
  with esbuild.
- Never log joke text, prompts or model replies; `core/src/log.ts` drops unknown fields.
