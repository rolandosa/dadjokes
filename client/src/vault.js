import { vaultApiClient } from '@veeva/vault';

const API = '/v25.2';
const OBJECT = 'dad_joke__c';
const HEADERS = { 'X-VaultAPI-ClientID': 'dad-joke-generator', Accept: 'application/json' };

async function call(path, init = {}) {
  const res = await vaultApiClient.fetch(`${API}${path}`, {
    ...init,
    headers: { ...HEADERS, ...(init.headers || {}) },
  });
  const body = await res.json();
  // WARNING still carries data (e.g. Vault flags repeated identical queries), so only FAILURE is an error.
  if (!res.ok || body.responseStatus === 'FAILURE') {
    const msg = body.errors?.map((e) => e.message).join('; ') || res.statusText;
    throw new Error(msg);
  }
  return body;
}

// Records in a bulk create/update response carry their own status.
function firstRecord(body) {
  const rec = body.data?.[0];
  if (!rec || rec.responseStatus !== 'SUCCESS') {
    throw new Error(rec?.errors?.map((e) => e.message).join('; ') || 'Vault rejected the joke');
  }
  return rec.data;
}

const query = (q) =>
  call('/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ q }).toString(),
  });

// Every generated joke is stored immediately, unrated.
export async function saveJoke({ setup, punchline, category }) {
  const name = setup.length > 120 ? `${setup.slice(0, 117)}...` : setup;
  const body = await call(`/vobjects/${OBJECT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([
      { name__v: name, joke_setup__c: setup, joke_punchline__c: punchline, joke_category__c: category },
    ]),
  });
  return firstRecord(body).id;
}

export async function rateJoke(id, level) {
  const body = await call(`/vobjects/${OBJECT}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ id, groan_level__c: level.key, groan_score__c: level.score }]),
  });
  return firstRecord(body).id;
}

const FIELDS = 'id, joke_setup__c, joke_punchline__c, joke_category__c, groan_level__c, groan_score__c, created_date__v';

export async function loadHallOfGroans() {
  const [top, recent, all] = await Promise.all([
    query(`SELECT ${FIELDS} FROM ${OBJECT} WHERE groan_score__c >= 1 ORDER BY groan_score__c DESC, created_date__v DESC PAGESIZE 8`),
    query(`SELECT ${FIELDS} FROM ${OBJECT} ORDER BY created_date__v DESC PAGESIZE 8`),
    query(`SELECT id, groan_score__c FROM ${OBJECT} PAGESIZE 1000`),
  ]);
  const rated = all.data.filter((r) => r.groan_score__c);
  const groans = rated.reduce((sum, r) => sum + Number(r.groan_score__c), 0);
  return {
    top: top.data,
    recent: recent.data,
    stats: {
      told: all.responseDetails?.total ?? all.data.length,
      rated: rated.length,
      avg: rated.length ? groans / rated.length : 0,
    },
  };
}
