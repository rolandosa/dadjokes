export interface LogFields {
  fn?: string;
  route?: string;
  status?: number;
  ms?: number;
  reqId?: string;
  err?: string;
  /** A fixed outcome word (`planned`, `sent`, ...), never free text. */
  outcome?: string;
  [countKey: `${string}Count`]: string | number | undefined;
}

const SCALAR_KEYS = new Set(['fn', 'route', 'status', 'ms', 'reqId', 'err', 'outcome']);

/** Only place in the codebase allowed to call console.*. Drops any field not allow-listed. */
export function log(fields: LogFields): void {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (SCALAR_KEYS.has(k) || k.endsWith('Count')) safe[k] = v;
  }
  safe.t = new Date().toISOString();
  console.log(JSON.stringify(safe));
}

/**
 * The class name of a thrown value, for the `err` field.
 *
 * A `throw` is not guaranteed to hand over an `Error`: a driver, a dependency or
 * a `Promise.reject()` with the wrong argument can produce a string, `null` or a
 * plain object. `(err as Error).name` then throws a TypeError INSIDE the catch
 * that is trying to report it, which escapes to whatever catch is outermost --
 * so the log line is never written and the raw TypeError message goes out
 * instead of a fixed one. Never the message and never a stack: a data-layer
 * message is free text, which SPEC "Logging" keeps out of log lines.
 */
export function errName(err: unknown): string {
  return err instanceof Error ? err.name : typeof err;
}
