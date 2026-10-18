/**
 * The joke-writing prompt (SPEC "Joke generation"). One new dad joke per call; the reply is
 * validated by parseJokeReply and anything else falls back to the library.
 */

export const JOKE_MAX_TOKENS = 200;

/** Some variety, unlike Pantry's parses: pulling the lever again should give a new joke. */
export const JOKE_TEMPERATURE = 1;

export const JOKE_SYSTEM = `You write one brand-new dad joke for the Dad-O-Matic 3000, a public joke page anyone can open.

The user message is JSON: {"topic": string, "avoid": string[]}. "avoid" lists setups told recently.

Return ONLY a JSON object with no other text:
{"setup": string, "punchline": string}

Rules:
- A classic dad joke: a short setup and a groan-worthy pun or wordplay punchline.
- The joke is about the topic.
- Family-friendly for all ages: no profanity, innuendo, insults, politics, religion, violence or real people.
- Not one of the "avoid" setups, and not a close rewording of one.
- setup: at most 140 characters. punchline: at most 120 characters. Plain text, one line each, no emoji, no quotation marks around the whole thing.
- If you cannot write one that follows every rule, return {"setup": null, "punchline": null}.`;

export interface JokeTopic {
  /** What the prompt asks the joke to be about. */
  topic: string;
}

export function jokeUserMessage(topic: string, avoid: readonly string[]): string {
  return JSON.stringify({ topic, avoid: avoid.slice(0, 20) });
}

/** Words that, if they appear, mean the reply is not going on a public page. */
const BLOCKED =
  /\b(damn|hell|crap|sex\w*|kill\w*|dead|die|drunk|beer|wine|nazi|stupid|idiot|fat)\b/i;

/** The joke in a model reply, or null when the reply breaks the schema or the rules. */
export function parseJokeReply(text: string): { setup: string; punchline: string } | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let v: unknown;
  try {
    v = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object') return null;
  const { setup, punchline } = v as Record<string, unknown>;
  if (typeof setup !== 'string' || typeof punchline !== 'string') return null;
  const s = setup.replace(/\s+/g, ' ').trim();
  const p = punchline.replace(/\s+/g, ' ').trim();
  if (s.length < 8 || s.length > 160 || p.length < 2 || p.length > 140) return null;
  if (BLOCKED.test(s) || BLOCKED.test(p)) return null;
  return { setup: s, punchline: p };
}
