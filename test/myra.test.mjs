import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deriveConfirmedTimeline, deriveTimeline, deriveWrapped, importTimedOut, parseTranscript, PROMISE_TRANSITIONS, reduceProposal, safeResults, transitionPromise } from '../domain.mjs';
import { createApp, withRetries } from '../server.mjs';

const fixture = JSON.parse(await readFile(new URL('../fixtures/myra.json', import.meta.url), 'utf8'));

test('fixture parses to 24 stable dated moments with LF and CRLF', () => {
  const lf = parseTranscript(fixture.transcript);
  const crlf = parseTranscript(fixture.transcript.replaceAll('\n', '\r\n'));
  assert.equal(lf.length, 24);
  assert.deepEqual(lf.map(x => x.customId), crlf.map(x => x.customId));
});

test('parser rejects malformed input', () => {
  assert.throws(() => parseTranscript('2024-02-30 12:00 - Maya: impossible'), /Invalid date/);
  assert.throws(() => parseTranscript('2024-01-01 12:00 - Sam: no'), /Malformed/);
  assert.throws(() => parseTranscript('bad\0text'), /NUL/);
});

test('required snapshots are exact', () => {
  assert.deepEqual(deriveTimeline(20240520), { day: 20240520, phase: 'Talking', promises: { kyoto: 'made' } });
  assert.deepEqual(deriveTimeline(20251018), { day: 20251018, phase: 'Long Distance', promises: { kyoto: 'deferred', calling: 'repaired', attack_on_titan: 'kept' } });
  assert.deepEqual(deriveTimeline(20270312), { day: 20270312, phase: 'Living Together', promises: { kyoto: 'fulfilled', calling: 'repaired', attack_on_titan: 'kept' } });
});

test('runtime timeline contains only confirmed events at the cutoff', () => {
  const events = [
    { type: 'phase', state: 'Talking', occurredDay: 20240302 },
    { type: 'promise', promiseId: 'kyoto', state: 'made', occurredDay: 20240520 },
    { type: 'phase', state: 'Long Distance', occurredDay: 20250905 },
    { type: 'promise', promiseId: 'kyoto', state: 'deferred', occurredDay: 20251018 },
    { type: 'promise', promiseId: 'kyoto', state: 'fulfilled', occurredDay: 20270312 }
  ];
  assert.deepEqual(deriveConfirmedTimeline(events, 20240520), { day: 20240520, phase: 'Talking', promises: { kyoto: 'made' } });
  assert.deepEqual(deriveConfirmedTimeline(events, 20251018), { day: 20251018, phase: 'Long Distance', promises: { kyoto: 'deferred' } });
  assert.equal(deriveConfirmedTimeline([], 20270312).phase, null);
});

test('promise transitions reject impossible jumps', () => {
  const states = Object.keys(PROMISE_TRANSITIONS);
  for (const [from, allowed] of Object.entries(PROMISE_TRANSITIONS)) for (const to of states) {
    if (allowed.includes(to)) assert.equal(transitionPromise(from, to), to);
    else assert.throws(() => transitionPromise(from, to), /Illegal/);
  }
});

test('search defense rejects future and unknown evidence', () => {
  const registry = { known: { deletedAt: null } };
  const results = [{ metadata: { sourceCustomId: 'known', occurredDay: 20240520 } }, { metadata: { sourceCustomId: 'known', occurredDay: 20270312 } }, { metadata: { sourceCustomId: 'unknown', occurredDay: 20240101 } }];
  assert.equal(safeResults(results, registry, 20240520).length, 1);
});

test('proposal reducer edits display text only and enforces versions', () => {
  const state = { version: 3, proposals: [{ id: 'p1', status: 'pending', kind: 'promise', state: 'made', occurredDay: 20240520, displayText: 'Kyoto', evidence: [] }], events: [] };
  const edited = reduceProposal(structuredClone(state), 'p1', 'edit', 'Kyoto together', 3);
  assert.equal(edited.proposals[0].displayText, 'Kyoto together');
  assert.equal(edited.proposals[0].occurredDay, 20240520);
  assert.throws(() => reduceProposal(edited, 'p1', 'confirm', null, 3), /version conflict/i);
  const confirmed = reduceProposal(edited, 'p1', 'confirm', null, 4);
  assert.equal(confirmed.events.length, 1);
});

test('Wrapped is evidence-dependent and omits invalidated claims', () => {
  const ref = sourceCustomId => ({ sourceCustomId });
  const registry = { a: { deletedAt: null }, b: { deletedAt: null }, c: { deletedAt: null }, d: { deletedAt: null } };
  const events = [
    { type: 'phase', evidence: [ref('a')] }, { type: 'phase', evidence: [ref('b')] },
    { type: 'promise', state: 'fulfilled', text: 'Kyoto fulfilled', evidence: [ref('c')] },
    { type: 'repair', evidence: [ref('d')] }, { type: 'change', evidence: [ref('a'), ref('c')] }
  ];
  assert.equal(deriveWrapped(events, registry).length, 6);
  registry.c.deletedAt = 'now';
  assert.equal(deriveWrapped(events, registry).some(card => card.id === 'kept'), false);
});

test('transient operations make exactly three total attempts', async () => {
  let attempts = 0;
  await assert.rejects(withRetries(async () => { attempts++; throw Object.assign(new Error('busy'), { status: 503 }); }, [0, 0]));
  assert.equal(attempts, 3);
  attempts = 0;
  await assert.rejects(withRetries(async () => { attempts++; throw Object.assign(new Error('bad'), { status: 400 }); }, [0, 0]));
  assert.equal(attempts, 1);
});

test('import timeout preserves the resumable run', () => {
  const run = { id: 'run_1', status: 'indexing', startedAt: 1_000, documents: [{ status: 'indexing' }] };
  assert.equal(importTimedOut(run, 120_999), false);
  assert.equal(importTimedOut(run, 121_000), true);
  assert.equal(run.status, 'indexing');
  assert.equal(importTimedOut({ ...run, status: 'ready' }, 999_999), false);
});

test('API imports, discovers, confirms, checks in, deletes, and resets', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'myra-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const documents = new Map(), deleted = new Set();
  let activeAdds = 0, maxAdds = 0;
  const adapter = {
    health: async () => true,
    add: async document => { activeAdds++; maxAdds = Math.max(maxAdds, activeAdds); await new Promise(resolve => setTimeout(resolve, 2)); activeAdds--; documents.set(document.customId, document); return { id: `remote_${document.customId}`, status: 'done' }; },
    status: async () => ({ status: 'done', dreamingStatus: 'done' }),
    search: async () => ({ results: [...documents.values()].filter(document => !deleted.has(document.customId)).slice(0, 8).map(document => ({ memory: document.content, metadata: document.metadata })) }),
    delete: async remoteId => { deleted.add(remoteId.replace(/^remote_/, '')); }
  };
  const server = createApp({ memoryAdapter: adapter, statePath: join(dir, 'state.json') }).listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => server.close(resolve)));
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let response = await fetch(`${base}/api/import`, { method: 'POST' }), body = await response.json();
  assert.equal(response.status, 202);
  let run;
  for (let i = 0; i < 50; i++) { await new Promise(resolve => setTimeout(resolve, 5)); run = await (await fetch(`${base}/api/import/${body.runId}`)).json(); if (run.status === 'ready') break; }
  assert.equal(run.documents.length, 24);
  assert.ok(run.proposals.length >= 12);
  assert.equal(maxAdds, 3);
  response = await fetch(`${base}/api/session`);
  const session = await response.json();
  assert.equal(session.importRun.id, body.runId);
  assert.equal(session.importRun.status, 'ready');
  assert.equal(session.proposals.length, run.proposals.length);
  for (const path of ['/app', '/app/overview', '/app/review', '/app/timeline', '/app/wrapped']) {
    response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
  }
  response = await fetch(`${base}/api/not-a-route`);
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type'), /application\/json/);
  response = await fetch(`${base}/api/proposals/${run.proposals[0].id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'confirm', version: run.version }) });
  const confirmed = await response.json();
  assert.equal(confirmed.proposal.status, 'confirmed');
  const duplicateBodies = [1, 2].map(() => fetch(`${base}/api/proposals/${run.proposals[1].id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'confirm', version: confirmed.version }) }));
  const duplicateResponses = await Promise.all(duplicateBodies);
  assert.deepEqual(duplicateResponses.map(item => item.status).sort(), [200, 409]);
  response = await fetch(`${base}/api/checkins`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ day: 20270701, text: fixture.supportedCheckins[0].text }) });
  const checkin = await response.json();
  assert.equal(response.status, 202, JSON.stringify(checkin));
  assert.equal(checkin.proposal.state, 'broken');
  response = await fetch(`${base}/api/checkins`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ day: 20270702, text: 'A quiet ordinary dinner' }) });
  assert.equal((await response.json()).proposal, null);
  const source = run.proposals[0].evidence[0].sourceCustomId;
  response = await fetch(`${base}/api/evidence/${source}`, { method: 'DELETE' });
  assert.equal(response.status, 200);
  response = await fetch(`${base}/api/reset`, { method: 'POST' });
  assert.equal(response.status, 200);
  response = await fetch(`${base}/api/reset`, { method: 'POST' });
  assert.equal(response.status, 200);
});

test('corrupt state is preserved and fixture reset recovers', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'myra-corrupt-')), statePath = join(dir, 'state.json');
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(statePath, '{not json');
  const adapter = { health: async () => true, delete: async () => {}, search: async () => ({ results: [] }), add: async () => ({ id: 'x', status: 'done' }), status: async () => ({ status: 'done' }) };
  const server = createApp({ memoryAdapter: adapter, statePath }).listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => server.close(resolve)));
  await new Promise(resolve => server.once('listening', resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/reset`, { method: 'POST' }), body = await response.json();
  assert.equal(body.recoveredCorruptState, true);
  assert.equal(JSON.parse(await readFile(statePath, 'utf8')).schemaVersion, 1);
  assert.equal((await readdir(dir)).some(name => name.startsWith('state.json.corrupt-')), true);
});

test('upstream errors never expose credentials or provider bodies', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'myra-redact-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const adapter = { health: async () => { throw new Error('Authorization: Bearer secret-key provider-body'); } };
  const server = createApp({ memoryAdapter: adapter, statePath: join(dir, 'state.json') }).listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => server.close(resolve)));
  await new Promise(resolve => server.once('listening', resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`), text = await response.text();
  assert.equal(response.status, 503);
  assert.doesNotMatch(text, /secret-key|provider-body|authorization/i);
});
