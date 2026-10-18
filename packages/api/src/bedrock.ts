import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { log } from '@dadjokes/core/log';
import type { Llm } from '@dadjokes/core/ports';
import { JOKE_MAX_TOKENS, JOKE_TEMPERATURE } from '@dadjokes/core/prompts/joke';

/**
 * The joke writer over Bedrock's Converse API (SPEC "Joke generation"). The model id comes
 * from JOKE_MODEL, which the stack sets from CDK context. Logs only the stop reason and token
 * count, never the joke.
 */
export function bedrockLlm(opts: { modelId?: string; client?: BedrockRuntimeClient } = {}): Llm {
  const client = opts.client ?? new BedrockRuntimeClient({ maxAttempts: 2, retryMode: 'adaptive' });
  const modelId = opts.modelId ?? process.env.JOKE_MODEL;
  if (!modelId) throw new Error('JOKE_MODEL is not set');
  return {
    async joke(system, user) {
      const out = await client.send(
        new ConverseCommand({
          modelId,
          system: [{ text: system }],
          messages: [{ role: 'user', content: [{ text: user }] }],
          inferenceConfig: { maxTokens: JOKE_MAX_TOKENS, temperature: JOKE_TEMPERATURE },
        }),
      );
      log({
        fn: 'api',
        outcome: `joke-stop-${out.stopReason ?? 'unknown'}`,
        outputTokenCount: out.usage?.outputTokens,
      });
      return (out.output?.message?.content ?? []).map((b) => b.text ?? '').join('');
    },
  };
}
