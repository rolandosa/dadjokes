// The site's backend: fn-api behind the same origin at /api (SPEC "API"). No login.
// `persona` is 'dad' or 'mom' (SPEC "Mom mode"): each has her own jokes and Hall of Groans.

async function call(path, init) {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

/** A brand-new joke, written by the model (or from the library as a fallback) and stored. */
export const nextJoke = (category, persona = 'dad') =>
  call('/jokes', { method: 'POST', body: JSON.stringify({ category, persona }) });

export async function rateJoke(id, level, persona = 'dad') {
  await call(`/jokes/${encodeURIComponent(id)}/rating`, {
    method: 'POST',
    body: JSON.stringify({ level: level.key, persona }),
  });
}

export const loadBoard = (persona = 'dad') => call(`/board?persona=${encodeURIComponent(persona)}`);
