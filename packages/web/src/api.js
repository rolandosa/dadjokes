// The site's backend: fn-api behind the same origin at /api (SPEC "API"). No login.

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
export const nextJoke = (category) =>
  call('/jokes', { method: 'POST', body: JSON.stringify({ category }) });

export async function rateJoke(id, level) {
  await call(`/jokes/${encodeURIComponent(id)}/rating`, {
    method: 'POST',
    body: JSON.stringify({ level: level.key }),
  });
}

export const loadBoard = () => call('/board');
