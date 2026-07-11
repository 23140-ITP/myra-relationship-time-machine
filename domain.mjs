import { createHash } from 'node:crypto';

const LINE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}) - (Maya|Ari): (.+)$/;

export function parseTranscript(input) {
  if (typeof input !== 'string' || Buffer.byteLength(input) > 1_000_000) throw new Error('Transcript must be UTF-8 text under 1 MB.');
  if (input.includes('\0')) throw new Error('Transcript contains a NUL byte.');
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const parsed = lines.map((line, index) => {
    const match = line.match(LINE);
    if (!match) throw new Error(`Malformed transcript line ${index + 1}.`);
    const [, year, month, day, hour, minute, speaker, message] = match;
    const iso = `${year}-${month}-${day}`;
    const date = new Date(`${iso}T00:00:00Z`);
    if (date.toISOString().slice(0, 10) !== iso || +hour > 23 || +minute > 59) throw new Error(`Invalid date on line ${index + 1}.`);
    return { line: index + 1, occurredDay: +(year + month + day), speaker, message, raw: line };
  });
  const moments = [];
  for (const item of parsed) {
    let moment = moments.at(-1);
    if (!moment || moment.occurredDay !== item.occurredDay) moments.push(moment = { occurredDay: item.occurredDay, sourceLineStart: item.line, lines: [] });
    moment.lines.push(item.raw);
    moment.sourceLineEnd = item.line;
  }
  return moments.map(moment => {
    const content = moment.lines.join('\n');
    return { ...moment, content, customId: `myra_maya_ari_${moment.occurredDay}_${createHash('sha256').update(content).digest('hex').slice(0, 8)}` };
  });
}

export const PROMISE_TRANSITIONS = {
  made: ['kept', 'deferred', 'broken', 'fulfilled'],
  kept: ['fulfilled', 'broken'],
  deferred: ['kept', 'broken', 'fulfilled'],
  broken: ['repaired'],
  repaired: ['kept', 'broken', 'fulfilled'],
  fulfilled: []
};

export function transitionPromise(from, to) {
  if (!PROMISE_TRANSITIONS[from]?.includes(to)) throw new Error(`Illegal promise transition: ${from} -> ${to}`);
  return to;
}

export function reduceProposal(state, id, action, displayText, expectedVersion) {
  if (expectedVersion !== state.version) throw Object.assign(new Error('State version conflict.'), { code: 'STATE_VERSION_CONFLICT' });
  const proposal = state.proposals.find(item => item.id === id);
  if (!proposal) throw Object.assign(new Error('Proposal not found.'), { code: 'PROPOSAL_NOT_FOUND' });
  if (proposal.status !== 'pending') throw Object.assign(new Error('Proposal is no longer pending.'), { code: 'PROPOSAL_FINAL' });
  if (!['confirm', 'reject', 'edit'].includes(action)) throw Object.assign(new Error('Invalid proposal action.'), { code: 'INVALID_ACTION' });
  if (action === 'edit') {
    if (typeof displayText !== 'string' || !displayText.trim() || displayText.length > 300) throw Object.assign(new Error('Display text must be 1-300 characters.'), { code: 'INVALID_TEXT' });
    proposal.displayText = displayText.trim();
  } else {
    proposal.status = action === 'confirm' ? 'confirmed' : 'rejected';
    if (action === 'confirm') {
      if (proposal.kind === 'promise') {
        const previous = state.events.filter(event => event.type === 'promise' && event.promiseId === proposal.promiseId && event.occurredDay <= proposal.occurredDay).sort((a, b) => a.occurredDay - b.occurredDay).at(-1);
        if (previous) transitionPromise(previous.state, proposal.state);
        else if (proposal.state !== 'made') throw Object.assign(new Error(`Promise ${proposal.promiseId} must begin in made state.`), { code: 'ILLEGAL_TRANSITION' });
      }
      state.events.push({ id: `event_${proposal.id}`, type: proposal.kind, state: proposal.state, promiseId: proposal.promiseId, occurredDay: proposal.occurredDay, text: proposal.displayText, evidence: proposal.evidence });
    }
  }
  state.version++;
  return state;
}

export function normalizeCheckin(text) {
  return text.replace(/\r\n/g, '\n').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function importTimedOut(run, now = Date.now()) {
  return Boolean(run && !['ready', 'failed'].includes(run.status) && now - run.startedAt >= 120_000);
}

export function deriveTimeline(day) {
  if (!Number.isInteger(day)) throw new Error('Invalid cutoff day.');
  const phase = day >= 20261221 ? 'Living Together' : day >= 20250905 ? 'Long Distance' : day >= 20240714 ? 'Dating' : 'Talking';
  const promises = {};
  if (day >= 20240520) promises.kyoto = day >= 20270312 ? 'fulfilled' : day >= 20250118 ? 'deferred' : 'made';
  if (day >= 20240901) promises.calling = day >= 20251005 ? 'repaired' : day >= 20251004 ? 'broken' : 'made';
  if (day >= 20240901) promises.attack_on_titan = day >= 20250803 ? 'kept' : 'made';
  return { day, phase, promises };
}

export function deriveConfirmedTimeline(events, day) {
  if (!Number.isInteger(day)) throw new Error('Invalid cutoff day.');
  const eligible = events.filter(event => event.occurredDay <= day).sort((a, b) => a.occurredDay - b.occurredDay);
  const phase = eligible.filter(event => event.type === 'phase' && event.state).at(-1)?.state || null;
  const promises = {};
  for (const event of eligible.filter(event => event.type === 'promise' && event.promiseId && event.state)) promises[event.promiseId] = event.state;
  return { day, phase, promises };
}

export function safeResults(results, registry, cutoff) {
  return results.filter(result => {
    const metadata = result.metadata || result.document?.metadata || {};
    const source = metadata.sourceCustomId;
    return source && registry[source] && !registry[source].deletedAt && +metadata.occurredDay <= cutoff;
  });
}

export function deriveWrapped(events, registry) {
  const supported = events.filter(event => event.evidence?.every(ref => registry[ref.sourceCustomId] && !registry[ref.sourceCustomId].deletedAt));
  const ids = type => supported.filter(event => event.type === type).flatMap(event => event.evidence.map(ref => ref.sourceCustomId));
  const phases = supported.filter(event => event.type === 'phase');
  const fulfilled = supported.find(event => event.type === 'promise' && event.state === 'fulfilled');
  const repairs = supported.filter(event => event.type === 'repair');
  return [
    phases.length > 1 && { id: 'chapters', title: 'Chapters crossed', value: `${phases.length} chapters, not one straight line.`, evidenceCustomIds: ids('phase') },
    fulfilled && { id: 'followed', title: 'Promise that followed you', value: fulfilled.text, evidenceCustomIds: fulfilled.evidence.map(x => x.sourceCustomId) },
    fulfilled && { id: 'kept', title: 'Promise kept', value: 'Kyoto became a shared commitment.', evidenceCustomIds: fulfilled.evidence.map(x => x.sourceCustomId) },
    repairs.length && { id: 'repairs', title: 'Hard-month repairs', value: `You chose repair ${repairs.length} times.`, evidenceCustomIds: ids('repair') },
    supported.find(e => e.type === 'change') && { id: 'changed', title: 'What changed most', value: '“Call me when you land” became “I’m home.”', evidenceCustomIds: ids('change') },
    repairs.length && { id: 'carry', title: 'Carry forward', value: 'Never cancel without calling.', evidenceCustomIds: repairs.at(-1).evidence.map(x => x.sourceCustomId) }
  ].filter(Boolean);
}
