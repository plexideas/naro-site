import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { record, report, cleanup, ignoredAgent } from '../netlify/functions/_shared/analytics.mts';
import handleEvent from '../netlify/functions/analytics-event.mts';
import { fetchReleases, summarize } from '../docs/download-stats.mjs';

function memoryStore() {
  const data = new Map();
  return {
    data,
    get: async (key) => data.get(key) ?? null,
    set: async (key, value, options = {}) => {
      if (options.onlyIfNew && data.has(key)) return { modified: false };
      data.set(key, value);
      return { modified: true };
    },
    delete: async (key) => data.delete(key),
    async *list({ prefix }) {
      const blobs = [...data.keys()].filter(key => key.startsWith(prefix)).map(key => ({ key }));
      for (let index = 0; index < blobs.length; index += 3) yield { blobs: blobs.slice(index, index + 3) };
    },
  };
}
const today = new Date('2026-09-24T12:00:00Z');

test('parallel visits and clicks deduplicate per visitor and day without losing other visitors', async () => {
  const store = memoryStore();
  await Promise.all(Array.from({ length: 20 }, () => record(store, 'download', '192.0.2.1', 'Browser A', today)));
  await record(store, 'visit', '192.0.2.2', 'Browser B', today);
  await record(store, 'download', '192.0.2.1', 'Browser A', new Date('2026-09-23T12:00:00Z'));
  const result = await report(store, today);
  assert.deepEqual(result.days.at(-1), { date: '2026-09-24', visitors: 2, downloads: 1 });
  assert.deepEqual(result.days.at(-2), { date: '2026-09-23', visitors: 1, downloads: 1 });
  assert.equal(result.days.length, 30);
  const stored = JSON.stringify([...store.data]);
  assert(!stored.includes('192.0.2.1'));
  assert(!stored.includes('Browser A'));
  const keys = [...store.data.keys()].filter(key => key.includes('/download/'));
  assert.notEqual(keys[0].split('/').at(-1), keys[1].split('/').at(-1));
});

test('retention removes expired records and old salts while preserving the current day', async () => {
  const store = memoryStore();
  await record(store, 'visit', '192.0.2.1', 'Browser', today);
  await record(store, 'visit', '192.0.2.1', 'Browser', new Date('2026-08-25T12:00:00Z'));
  await record(store, 'visit', '192.0.2.1', 'Browser', new Date('2026-08-26T12:00:00Z'));
  await cleanup(store, today);
  assert.equal([...store.data.keys()].filter(key => key.startsWith('salts/')).length, 1);
  assert(![...store.data.keys()].some(key => key.includes('2026-08-25')));
  assert.equal((await report(store, today)).days[0].visitors, 1);
});

test('bad origin, method, bots and malformed events do not reach storage', async () => {
  const context = { ip: '192.0.2.1' };
  const request = (body, overrides = {}) => new Request('https://naro.tools/api/analytics/event', {
    method: 'POST', body, headers: { origin: 'https://naro.tools', 'user-agent': 'Browser' }, ...overrides,
  });
  assert.equal((await handleEvent(request('visit', { headers: { origin: 'https://other.test' } }), context)).status, 403);
  assert.equal((await handleEvent(new Request('https://naro.tools/api/analytics/event'), context)).status, 405);
  assert.equal((await handleEvent(request('bad'), context)).status, 400);
  assert.equal((await handleEvent(request('visit', { headers: { origin: 'https://naro.tools', 'user-agent': 'Googlebot' } }), context)).status, 204);
  assert.equal(ignoredAgent('NaroAnalyticsCheck'), true);
});

test('release counts separate ZIP and DMG and fetch all pages without partial totals', async () => {
  const result = summarize([{ tag_name: 'v1', assets: [
    { name: 'Naro-1.dmg', state: 'uploaded', download_count: 3 },
    { name: 'Naro-1.zip', state: 'uploaded', download_count: 5 },
    { name: 'latest.json', state: 'uploaded', download_count: 99 },
  ] }]);
  assert.equal(result.dmg, 3);
  assert.equal(result.zip, 5);
  let count = 0;
  const releases = await fetchReleases(async () => ({ ok: true, json: async () => ++count === 1 ? Array(100).fill({}) : [] }));
  assert.equal(releases.length, 100);
  assert.equal(count, 2);
  await assert.rejects(fetchReleases(async () => ({ ok: false, status: 429 })), /request limit/);
});

test('client sends same-origin events and never intercepts downloads or tracks local previews', () => {
  const source = readFileSync(new URL('../docs/analytics.js', import.meta.url), 'utf8');
  function run(hostname, blocked = false) {
    const events = [];
    const listeners = {};
    vm.runInNewContext(source, {
      location: { hostname }, URL,
      navigator: { sendBeacon: (url, body) => { if (blocked) throw new Error(); events.push([url, body]); return true; } },
      document: { visibilityState: 'visible', addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener() {} },
    });
    return { events, listeners };
  }
  const live = run('naro.tools');
  live.listeners.click({ button: 0, target: { closest: () => ({ href: 'https://github.com/plexideas/naro/releases/latest' }) }, preventDefault() { throw new Error(); } });
  assert.deepEqual(live.events, [['/api/analytics/event', 'visit'], ['/api/analytics/event', 'download']]);
  assert.equal(run('localhost').events.length, 0);
  assert.doesNotThrow(() => run('naro.tools', true));
});
