# Dad-O-Matic 3000: spec

## Overview

A dad-joke page. Pull the lever and Sonnet writes a new joke; press "Hit me with it!" for the
punchline, then rate it on the Groan-o-Meter. Two front doors share one UI (`packages/ui`):

- **The public site** on AWS (`packages/web`, `packages/api`, `infra`). No login, no paywall:
  anyone with the link can tell and rate jokes. Jokes are written by Bedrock.
- **The Vault Custom Page** (`packages/vault`, `mdl/`). Jokes come from the built-in library
  and are stored as `dad_joke__c` records in the Vault.

Same AWS account and region as Pantry and OurToDos (`us-east-2`), built on OurToDos' skeleton:
`core` (rules, no I/O), `data` (DynamoDB), `api` (Lambda), `web` (the page), `infra` (CDK).

## Data model

One DynamoDB table, `dadjokes`, keys only (`PK`, `SK`), no index. On-demand billing capped at
50 read / 20 write request units per second: the account's always-free 25 WCU are already
used by Pantry (provisioned 15 RCU / 25 WCU) and OurToDos (5/5).

| PK      | SK                | What                                                                                |
| ------- | ----------------- | ----------------------------------------------------------------------------------- |
| `FEED`  | `J#<ulid>`        | Every told joke. ULIDs sort by time, so newest is last.                             |
| `TOP`   | `<score>#<ulid>`  | A copy of each rated joke, so a reverse query ranks them.                           |
| `STATS` | `STATS`           | `told`, `rated`, `groans` (sum of scores), `bank`, `reused`, `sinceReuse` counters. |
| `STATS` | `AI#<YYYY-MM-DD>` | Model calls that UTC day, for the daily cap.                                        |

A joke row holds `id, key, category, setup, punchline, toldAt`, plus `level, score` once rated
and `reusedFrom` (the original's id) when it is an encore.
An unrated row has no `level`/`score` attributes (not NULLs); rating is conditional on
`score` being absent, so a joke is rated at most once and the counters stay exact.

## Service

`core/src/service.ts`:

- `newJoke(repo, llm, category, {dailyCap})`: picks the category (a random one for `any` or
  anything unknown), bumps the day's model-call count, asks the model for a joke on that
  category's topic, avoiding the 20 most recent setups, validates the reply and stores it with
  `key: 'ai'`. It falls back to an untold library joke when there is no model, the cap is
  passed, the call throws or the reply breaks the rules. The source is logged as
  `joke-encore`, `joke-ai`, `joke-library-cap`, `joke-library-bad-reply`, `joke-library-llm-error` or
  `joke-library-no-llm`.
- `rateJoke(repo, id, level)`: `NotFound` for an unknown id, `BadInput` for an unknown level,
  `Conflict` when already rated.
- `board(repo)`: the 8 top-rated jokes, the 8 newest, and the stats.

Joke text never comes from a request: it is written by the model or taken from the library.

## Encores

Once the bank (original jokes stored, `STATS.bank`) holds more than 200 jokes, a stored joke
may be told again. After an encore, 9 originals must be told before the next one, so there are
never two in a row and at most one in any ten consecutive jokes.

- The slot is taken atomically (`claimReuse`): a conditional update sets `sinceReuse` to 0 only
  when `bank > 200` and `sinceReuse >= 9` (or is absent). Each original adds 1 to `bank` and
  `sinceReuse`; an encore adds 1 to `told` and `reused`.
- The joke: from a random point in the bank's history, up to 3 draws of 25 neighbouring
  originals; it takes the best-rated one that fits the asked category (any, for "Surprise me")
  and is not among the last 20 setups told. If no draw finds one, the slot is spent and a new
  joke is told.
- An encore is a new row (its own id and rating) with `reusedFrom` set; the page says
  "Encore!" when it shows one. Encores are never drawn as originals for another encore.

## Joke generation

`core/src/prompts/joke.ts`, called through Bedrock's Converse API (`api/src/bedrock.ts`).

- Audience: Veeva employees. The prompt says so, and the `vault` category's topic is Veeva Vault
  and life-sciences work. Jokes stay affectionate: no mocking Veeva, customers or competitors,
  and no claims about real drugs or patient safety.
- Model: `JOKE_MODEL`, from CDK context `jokeModel`, default `us.anthropic.claude-sonnet-4-6`
  (Sonnet 5 / 5.5 and Haiku 5.5 are not enabled on the account). Temperature 1, max 200 tokens.
- Reply: `{"setup": string, "punchline": string}`, or both null when the model cannot comply.
  `parseJokeReply` takes the outermost `{...}`, requires both strings, a setup of 8 to 160
  characters and a punchline of 2 to 140, and rejects a short list of words that should not
  appear on a public page. Anything else counts as a bad reply.
- Cap: `AI_DAILY_CAP` model calls per UTC day (CDK context `aiDailyCap`, default 500). Past it,
  the lever keeps working with library jokes.

## API

`fn-api` on a Lambda Function URL, served by CloudFront under the site's origin at `/api/*`.

| Method | Path                     | Body          | Answers                                    |
| ------ | ------------------------ | ------------- | ------------------------------------------ |
| GET    | `/api/healthz`           |               | 200 `{ok, version}`                        |
| GET    | `/api/board`             |               | 200 `{top, recent, stats}`, `no-store`     |
| POST   | `/api/jokes`             | `{category?}` | 201 the stored joke                        |
| POST   | `/api/jokes/{id}/rating` | `{level}`     | 204; 400 bad level; 404 no joke; 409 rated |

Bodies over 4 KB answer 413 unread. Anything else is 404.

## Web

`packages/web`: Vite, no framework. `src/main.js` mounts the shared UI with a backend that calls
`/api`. While the model writes, Dad's mouth moves and the bubble says he is thinking. On phones
a "Tell me a joke" button sits under the bubble, because the lever panel is below the fold.

## Infrastructure

`infra/lib/dadjokes-stack.ts`, stack `DadJokes`:

- the table (retained, deletion-protected, point-in-time recovery);
- `fn-api`: Node 22 arm64, 512 MB, 20 s, `bedrock:InvokeModel` on Anthropic models only;
- a private S3 bucket and one CloudFront distribution: the page by default, `/api/*` to the
  Function URL with caching off. `index.html` and the manifest upload no-cache and are
  invalidated on deploy; hashed assets are immutable.
- CSP: `default-src 'self'`, Google Fonts allowed for styles and fonts, `frame-ancestors 'none'`.

There are no secrets and no SSM parameters.

## Logging

`core/src/log.ts` only: route, status, duration, request id, error class, outcome words and
token counts. Never a joke's text, the prompt or the model's reply.

## Local

`pnpm dev`: fn-api on 8807 (memory store, fixture joke writer) and the site on 5175 with `/api`
proxied. `LLM_MODE=bedrock` in `local/.env.local` uses real Sonnet through local AWS
credentials. `STORE=dynamodb` uses DynamoDB Local (`pnpm local:tables`).

## Later

- A custom domain (Route 53 + ACM) instead of the CloudFront address.
- Per-visitor rate limiting (AWS WAF) if the link is shared widely.
- Let the Vault page call the AI writer through a Vault Connection.
