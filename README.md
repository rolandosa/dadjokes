# Dad-O-Matic 3000 🎰👔

Pull the lever, and Dad (a felt puppet) tells a brand-new dad joke written by Claude Sonnet.
Press **Hit me with it!** for the punchline, then rate the damage on the **Groan-o-Meter™**.

**Live site:** https://d2iyz0mir8bsvu.cloudfront.net/ (no login). Share it with
[`docs/qr-card.png`](docs/qr-card.png), or the bare code in [`docs/qr.png`](docs/qr.png).

![Dad-O-Matic on the web](docs/screenshot.png)

The same page also runs inside Veeva Vault as a Custom Page, storing jokes as Vault records.
[`docs/SPEC.md`](docs/SPEC.md) has the details.

## What it does

- **New jokes every time.** Sonnet 4.6 (Bedrock) writes each joke on a topic from the picked
  category, avoiding the last 20 told. If the model fails, writes something off-limits, or the
  daily cap of 500 calls is reached, Dad falls back to the built-in library.
- **Rate the damage.** In dad-joke land, the more it hurts the better:

  | Score | Groan level      |                                            |
  | ----- | ---------------- | ------------------------------------------ |
  | 1     | 😐 Polite Nod    | Dad is concerned.                          |
  | 2     | 🙄 Eye Roll      | The dad engine is warming up.              |
  | 3     | 😩 Audible Groan | Small victory lap around the grill.        |
  | 4     | 🤦 Full Facepalm | LinkedIn updated: "Professional Punsmith". |
  | 5     | 🚪 Left the Room | The highest honour a dad can receive.      |

- **Hall of Groans** (top-rated) and **Fresh Off the Grill** (latest), shared by everyone.
- The Vault page also has a **Fullscreen** button (Esc exits); the public site does not.

## Layout

| Path             | What                                                               |
| ---------------- | ------------------------------------------------------------------ |
| `packages/core`  | Joke library, Groan-o-Meter, the joke prompt and the service rules |
| `packages/data`  | DynamoDB repo and an in-memory one for local runs and tests        |
| `packages/api`   | fn-api (Lambda) and the Bedrock adapter                            |
| `packages/ui`    | The Dad-O-Matic page itself, shared by the site and the Vault page |
| `packages/web`   | The public site (Vite)                                             |
| `packages/vault` | The Vault Custom Page build                                        |
| `infra`          | CDK stack `DadJokes`: table, function, S3 + CloudFront             |
| `mdl`            | Vault object, picklist, page and tab                               |
| `scripts`        | QR code, Vault deploy, Dad photo cutout, local tables              |

## Develop

```sh
pnpm install
cp local/.env.example local/.env.local
pnpm dev            # site on http://localhost:5175, canned jokes
```

Set `LLM_MODE=bedrock` in `local/.env.local` (and drop the `local` AWS keys) to get real jokes
through your AWS credentials.

Checks, as CI runs them: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`,
plus `pnpm test:int` with DynamoDB Local (`docker compose -f local/docker-compose.yml up -d`)
and `pnpm aws:synth`.

## Deploy

With AWS credentials for the account:

```sh
pnpm aws:deploy     # builds the site, deploys the DadJokes stack (us-east-2)
pnpm qr             # rewrites docs/qr.png from the stack's WebUrl
```

Options: `-c jokeModel=<bedrock model id>` and `-c aiDailyCap=<calls per day>` on
`pnpm --filter @dadjokes/infra exec cdk deploy`.

The Vault page: `VAULT_HOST=myvault.veevavault.com VAULT_SESSION=<session id> pnpm vault:deploy`.

## Replacing Dad

Supply four photos that are identical apart from the face: rest (mouth closed), talk (mouth
part open), grin (big laugh) and blink (eyes closed), with a light background. Then:

```sh
pip install numpy pillow scipy
python3 scripts/cutout.py rest.jpg talk.jpg grin.jpg blink.jpg   # writes packages/ui/assets/*.webp
```
