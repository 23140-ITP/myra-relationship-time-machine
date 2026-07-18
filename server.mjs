import express from 'express';
import { createHash } from 'node:crypto';
import { readFile, mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deriveConfirmedTimeline, deriveWrapped, importTimedOut, normalizeCheckin, parseTranscript, reduceProposal, safeResults } from './domain.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/myra.json', import.meta.url), 'utf8'));
const emptyState = () => ({ schemaVersion: 1, version: 1, relationship: fixture.relationship, importRun: null, registry: {}, proposalSchema: 0, proposals: [], events: [] });
const queries = {
  promise: 'Promises and commitments Maya and Ari made to each other',
  milestone: 'Relationship milestones and changes between Maya and Ari',
  repair: 'Conflicts, boundaries, repair attempts, and reconciliations'
};

export async function withRetries(operation, delays = [250, 750]) {
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      if (attempt >= delays.length || (error.status && error.status < 500 && ![408, 429].includes(error.status))) throw error;
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }
  }
}

export function assertLoopbackUrl(value, label) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label} must be a valid URL.`); }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error(`${label} must use a local HTTP loopback address.`);
  return url.toString().replace(/\/$/, '');
}

export function createMemoryAdapter({ baseUrl = 'http://127.0.0.1:6767', apiKey = '' } = {}) {
  const request = async (path, options = {}, timeout = 15_000) => {
    const signal = AbortSignal.timeout(timeout);
    const response = await fetch(baseUrl + path, { ...options, signal, headers: { ...(apiKey && { authorization: `Bearer ${apiKey}` }), 'content-type': 'application/json' } });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) throw Object.assign(new Error('Supermemory request failed.'), { status: response.status });
    return body;
  };
  return {
    health: () => fetch(baseUrl, { signal: AbortSignal.timeout(3_000) }).then(r => r.ok),
    add: document => request('/v3/documents', { method: 'POST', body: JSON.stringify(document) }),
    status: id => request(`/v3/documents/${encodeURIComponent(id)}`),
    search: (q, day) => request('/v4/search', { method: 'POST', body: JSON.stringify({ q, containerTag: 'relationship_maya_ari', searchMode: 'hybrid', threshold: 0.25, rerank: false, limit: 8, include: { documents: true, summaries: true }, ...(day && { filters: { AND: [{ filterType: 'numeric', key: 'occurredDay', value: String(day), numericOperator: '<=' }] } }) }) }, 10_000),
    delete: id => request(`/v3/documents/${encodeURIComponent(id)}`, { method: 'DELETE' }, 10_000)
  };
}

export function createApp({ memoryAdapter, statePath = join(process.cwd(), '.data', 'myra-state.json') }) {
  const app = express();
  const publicIndex = fileURLToPath(new URL('./public/index.html', import.meta.url));
  let state = emptyState(), queue = Promise.resolve();
  const load = readFile(statePath, 'utf8').then(text => { const next = JSON.parse(text); if ((next.schemaVersion ?? 1) !== 1 || !Number.isInteger(next.version)) throw Error('Unsupported state version.'); state = next; }).catch(error => { if (error.code !== 'ENOENT') state.corrupt = true; });
  const mutate = reducer => {
    const operation = queue.then(async () => { await load; if (state.corrupt) throw Error('State file is corrupt; reset is required.'); const next = reducer(structuredClone(state)); await mkdir(dirname(statePath), { recursive: true }); await writeFile(`${statePath}.tmp`, JSON.stringify(next, null, 2)); await rename(`${statePath}.tmp`, statePath); state = next; return state; });
    queue = operation.catch(() => {});
    return operation;
  };
  const fail = (res, status, code, message, retryable = false) => res.status(status).json({ error: { code, message, retryable } });
  const evidenceFor = result => {
    const metadata = result.metadata || result.document?.metadata || {};
    const excerpt = result.chunk || result.memory || result.summary || result.content || result.document?.content || '';
    return { sourceCustomId: metadata.sourceCustomId, sourceLineStart: +metadata.sourceLineStart, sourceLineEnd: +metadata.sourceLineEnd, excerptHash: createHash('sha256').update(excerpt).digest('hex') };
  };
  const discover = async () => {
    const found = {};
    for (const [kind, query] of Object.entries(queries)) {
      const upstream = await memoryAdapter.search(query);
      found[kind] = safeResults(upstream.results || upstream.memories || [], state.registry, 99999999);
    }
    const pick = async (query, pattern, fallback = []) => {
      const upstream = await memoryAdapter.search(query), results = safeResults(upstream.results || upstream.memories || [], state.registry, 99999999);
      return [...results, ...fallback].find(result => pattern.test(result.chunk || JSON.stringify(result))) || results[0] || fallback[0];
    };
    const promiseDefinitions = [
      ['kyoto', 'made', 'Maya and Ari Kyoto promise when internship and distance ends', /internship|take you to kyoto/i],
      ['kyoto', 'deferred', 'Maya and Ari Kyoto promise deferred during long distance', /defer|wait/i],
      ['kyoto', 'fulfilled', 'Maya and Ari Kyoto promise fulfilled at Kyoto station', /fulfilled|kyoto station/i],
      ['calling', 'made', 'Maya and Ari promise never cancel without calling', /no cancelling|without calling/i],
      ['calling', 'broken', 'Ari broke the no cancelling without calling promise', /broke|broken|cancelled/i],
      ['calling', 'repaired', 'Maya and Ari repaired the cancelled call promise', /repair five|calling promise is repaired/i],
      ['attack_on_titan', 'made', 'Maya and Ari promise to watch Attack on Titan together', /attack on titan|anime/i],
      ['attack_on_titan', 'kept', 'Maya and Ari kept the Attack on Titan Sunday promise', /kept|watched/i]
    ];
    const phaseDefinitions = [
      ['Talking', 'Maya and Ari early talking phase before dating', /best wrong table|where this is going/i],
      ['Dating', 'Maya and Ari officially started dating', /girlfriend|dating, officially/i],
      ['Long Distance', 'Maya and Ari began their long distance chapter', /long-distance chapter|long distance/i],
      ['Living Together', 'Maya and Ari signed a lease and began living together', /signed the lease|living together/i]
    ];
    const promiseSpecs = (await Promise.all(promiseDefinitions.map(async ([promiseId, lifecycle, query, pattern]) => ({ kind: 'promise', promiseId, state: lifecycle, result: await pick(query, pattern, found.promise) })))).filter(spec => spec.result);
    const phaseSpecs = (await Promise.all(phaseDefinitions.map(async ([phase, query, pattern]) => ({ kind: 'phase', state: phase, result: await pick(query, pattern, found.milestone) })))).filter(spec => spec.result);
    const specs = [
      ...promiseSpecs,
      ...phaseSpecs,
      ...found.repair.slice(0, 7).map(result => ({ kind: 'repair', result })),
      ...found.milestone.slice(-1).map(result => ({ kind: 'change', result }))
    ];
    await mutate(next => { next.proposalSchema = 6; next.proposals = specs.map((spec, index) => { const evidence = evidenceFor(spec.result); return { id: `proposal_${index + 1}`, status: 'pending', kind: spec.kind, promiseId: spec.promiseId, state: spec.state, occurredDay: next.registry[evidence.sourceCustomId].occurredDay, displayText: spec.result.chunk || spec.result.memory || spec.result.summary || spec.result.content || spec.result.document?.content || `${spec.kind} discovered by Supermemory`, evidence: [evidence] }; }); return next; });
  };
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));

  app.get('/api/health', async (_req, res) => {
    await load;
    const supermemory = await Promise.resolve().then(() => memoryAdapter.health()).catch(() => false);
    res.status(supermemory ? 200 : 503).json({ ok: Boolean(supermemory), ready: Boolean(supermemory) && state.importRun?.status === 'ready', services: { supermemory: Boolean(supermemory) }, privacyMode: 'local-first' });
  });
  app.get('/api/session', async (_req, res) => {
    await load;
    const run = state.importRun;
    res.json({
      importRun: run ? { id: run.id, status: importTimedOut(run) ? 'timeout' : run.status, startedAt: run.startedAt, documents: run.documents } : null,
      proposals: state.proposals,
      version: state.version
    });
  });
  app.post('/api/import', async (_req, res) => {
    let moments; try { moments = parseTranscript(fixture.transcript); if (moments.length !== 24) throw Error('Expected exactly 24 moments.'); } catch (error) { return fail(res, 422, 'FIXTURE_MISMATCH', error.message); }
    if (state.importRun && ['ingesting', 'indexing', 'ready'].includes(state.importRun.status)) return res.status(202).json({ runId: state.importRun.id });
    const runId = `run_${Date.now()}`;
    await mutate(next => ({ ...next, importRun: { id: runId, status: 'ingesting', startedAt: Date.now(), documents: [] }, registry: {}, proposals: [] }));
    let cursor = 0;
    const worker = async () => { while (cursor < moments.length) { const moment = moments[cursor++]; try { const payload = { content: moment.content, customId: moment.customId, containerTag: 'relationship_maya_ari', dreaming: 'instant', metadata: { relationshipId: 'maya_ari', occurredDay: moment.occurredDay, sourceCustomId: moment.customId, sourceLineStart: moment.sourceLineStart, sourceLineEnd: moment.sourceLineEnd, kind: 'conversation_moment' } }; const remote = await withRetries(() => memoryAdapter.add(payload)); await mutate(next => { const doc = { ...moment, content: undefined, remoteDocumentId: remote.id, status: remote.status || 'queued', deletedAt: null }; next.importRun.documents.push(doc); next.registry[moment.customId] = doc; return next; }); } catch { await mutate(next => { next.importRun.documents.push({ ...moment, content: undefined, status: 'failed' }); return next; }); } } };
    Promise.all([worker(), worker(), worker()]).then(() => mutate(next => { next.importRun.status = next.importRun.documents.some(x => x.status === 'failed') ? 'failed' : 'indexing'; return next; }));
    res.status(202).json({ runId });
  });
  app.get('/api/import/:runId', async (req, res) => {
    await load; if (state.importRun?.id !== req.params.runId) return fail(res, 404, 'RUN_NOT_FOUND', 'Import run not found.');
    if (state.importRun.status === 'indexing') { const updates = await Promise.all(state.importRun.documents.map(async doc => ({ customId: doc.customId, ...(await memoryAdapter.status(doc.remoteDocumentId)) }))); await mutate(next => { for (const update of updates) { const doc = next.importRun.documents.find(x => x.customId === update.customId); doc.status = update.status; doc.dreamingStatus = update.dreamingStatus; } if (next.importRun.documents.every(x => x.status === 'done' && (!x.dreamingStatus || x.dreamingStatus === 'done'))) next.importRun.status = 'ready'; return next; }); }
    if (state.importRun.status === 'ready' && state.proposalSchema !== 6) await discover();
    res.json({ ...state.importRun, status: importTimedOut(state.importRun) ? 'timeout' : state.importRun.status, proposals: state.proposals, version: state.version });
  });
  app.post('/api/import/:runId/retry', async (req, res) => {
    if (state.importRun?.id !== req.params.runId) return fail(res, 404, 'RUN_NOT_FOUND', 'Import run not found.');
    const failed = state.importRun.documents.filter(doc => doc.status === 'failed');
    if (!failed.length) return res.json({ runId: req.params.runId, retried: 0 });
    for (const doc of failed) { try { const moment = parseTranscript(fixture.transcript).find(item => item.customId === doc.customId); const remote = await memoryAdapter.add({ content: moment.content, customId: moment.customId, containerTag: 'relationship_maya_ari', dreaming: 'instant', metadata: { relationshipId: 'maya_ari', occurredDay: moment.occurredDay, sourceCustomId: moment.customId, sourceLineStart: moment.sourceLineStart, sourceLineEnd: moment.sourceLineEnd, kind: 'conversation_moment' } }); await mutate(next => { const target = next.importRun.documents.find(item => item.customId === doc.customId); Object.assign(target, { remoteDocumentId: remote.id, status: remote.status || 'queued' }); next.registry[doc.customId] = target; next.importRun.status = 'indexing'; return next; }); } catch {} }
    res.json({ runId: req.params.runId, retried: failed.length });
  });
  app.post('/api/proposals/:id', async (req, res) => {
    try { const next = await mutate(current => reduceProposal(current, req.params.id, req.body.action, req.body.displayText, req.body.version)); res.json({ proposal: next.proposals.find(item => item.id === req.params.id), version: next.version }); }
    catch (error) { const conflict = error.code === 'STATE_VERSION_CONFLICT'; fail(res, conflict ? 409 : error.code === 'PROPOSAL_NOT_FOUND' ? 404 : 400, error.code || 'INVALID_PROPOSAL', error.message); }
  });
  app.post('/api/checkins', async (req, res) => {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    const day = +req.body.day;
    if (!text || text.length > 1000 || !/^\d{8}$/.test(String(day))) return fail(res, 400, 'INVALID_CHECKIN', 'Check-in text and day=YYYYMMDD are required.');
    const normalized = normalizeCheckin(text), supported = fixture.supportedCheckins.find(item => normalizeCheckin(item.text) === normalized);
    const customId = `myra_maya_ari_${day}_checkin_${Date.now()}`, remote = await withRetries(() => memoryAdapter.add({ content: text, customId, containerTag: 'relationship_maya_ari', dreaming: 'instant', metadata: { relationshipId: 'maya_ari', occurredDay: day, sourceCustomId: customId, sourceLineStart: 1, sourceLineEnd: 1, kind: 'checkin' } }));
    let readiness = remote;
    for (let attempt = 0; attempt < 240 && (readiness.status !== 'done' || (readiness.dreamingStatus && readiness.dreamingStatus !== 'done')); attempt++) { if (readiness.status === 'failed') throw new Error('Check-in indexing failed.'); await new Promise(resolve => setTimeout(resolve, 500)); readiness = await memoryAdapter.status(remote.id); }
    if (readiness.status !== 'done' || (readiness.dreamingStatus && readiness.dreamingStatus !== 'done')) throw new Error('Check-in indexing timed out.');
    await memoryAdapter.search(`Promise affected by this check-in: ${text}`, day);
    await mutate(next => { const doc = { customId, remoteDocumentId: remote.id, status: remote.status || 'queued', occurredDay: day, sourceLineStart: 1, sourceLineEnd: 1, deletedAt: null }; next.registry[customId] = doc; if (supported) next.proposals.push({ id: `proposal_checkin_${Date.now()}`, status: 'pending', kind: 'promise', promiseId: supported.promiseId, state: supported.state, occurredDay: day, displayText: text, evidence: [{ sourceCustomId: customId, sourceLineStart: 1, sourceLineEnd: 1, excerptHash: customId.slice(-8) }] }); return next; });
    res.status(202).json({ saved: true, proposal: supported ? state.proposals.at(-1) : null, version: state.version });
  });
  app.get('/api/timeline', async (req, res) => { const day = +req.query.day; if (!/^\d{8}$/.test(String(req.query.day)) || !Number.isInteger(day)) return fail(res, 400, 'INVALID_DAY', 'Use day=YYYYMMDD.'); const confirmed = deriveConfirmedTimeline(state.events, day); try { const upstream = await memoryAdapter.search(req.query.q || 'Maya and Ari relationship memories', day); res.json({ ...confirmed, evidence: safeResults(upstream.results || upstream.memories || [], state.registry, day) }); } catch { res.json({ ...confirmed, evidence: [], warning: 'Search unavailable; showing confirmed state.' }); } });
  app.get('/api/wrapped', (_req, res) => res.json({ cards: deriveWrapped(state.events, state.registry) }));
  app.delete('/api/evidence/:customId', async (req, res) => {
    const doc = state.registry[req.params.customId]; if (!doc || doc.deletedAt) return fail(res, 404, 'EVIDENCE_NOT_FOUND', 'Evidence not found.');
    try {
      try { await memoryAdapter.delete(doc.remoteDocumentId); } catch (error) { if (error.status !== 404) throw error; }
      const upstream = await memoryAdapter.search(doc.customId);
      if (safeResults(upstream.results || upstream.memories || [], state.registry, 99999999).some(item => (item.metadata || item.document?.metadata)?.sourceCustomId === doc.customId)) return fail(res, 409, 'DELETION_PROCESSING', 'Deletion is still processing.', true);
      await mutate(next => { next.registry[doc.customId].deletedAt = new Date().toISOString(); next.events = next.events.filter(event => !event.evidence.some(ref => ref.sourceCustomId === doc.customId)); return next; });
      res.json({ deleted: true, invalidatedEvents: true });
    } catch { fail(res, 503, 'DELETE_FAILED', 'Could not delete evidence from Supermemory.', true); }
  });
  app.post('/api/reset', async (_req, res) => {
    await load;
    if (state.corrupt) {
      await mkdir(dirname(statePath), { recursive: true });
      await rename(statePath, `${statePath}.corrupt-${Date.now()}`);
      const fresh = emptyState();
      await writeFile(`${statePath}.tmp`, JSON.stringify(fresh, null, 2));
      await rename(`${statePath}.tmp`, statePath);
      state = fresh;
      return res.json({ ok: true, recoveredCorruptState: true });
    }
    for (const doc of Object.values(state.registry)) { if (doc.remoteDocumentId && !doc.deletedAt) try { await memoryAdapter.delete(doc.remoteDocumentId); } catch (error) { if (error.status !== 404) return fail(res, 503, 'DELETE_FAILED', 'Could not reset Supermemory.', true); } }
    await mutate(() => emptyState()); res.json({ ok: true });
  });
  app.get(['/app', '/app/{*splat}'], (_req, res) => res.sendFile(publicIndex));
  app.use('/api', (_req, res) => fail(res, 404, 'NOT_FOUND', 'API route not found.'));
  app.use((error, _req, res, _next) => fail(res, 503, 'UPSTREAM_FAILED', error.message === 'State file is corrupt; reset is required.' ? error.message : 'Supermemory operation failed.', true));
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const supermemoryUrl = assertLoopbackUrl(process.env.SUPERMEMORY_API_URL || 'http://127.0.0.1:6767', 'SUPERMEMORY_API_URL');
  const adapter = createMemoryAdapter({ apiKey: process.env.SUPERMEMORY_API_KEY, baseUrl: supermemoryUrl });
  createApp({ memoryAdapter: adapter }).listen(3000, '127.0.0.1', () => console.log('MYRA: http://127.0.0.1:3000'));
}
