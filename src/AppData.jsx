import { createContext, useContext, useEffect, useRef, useState } from 'react';

export const dates = [20240520, 20251018, 20270312];
export const labels = ['May 20, 2024', 'October 18, 2025', 'March 12, 2027'];
export const hints = ['The beginning', 'The distance', 'The return'];

async function request(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || 'Something went wrong.');
  return body;
}

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [runId, setRunId] = useState();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [ready, setReady] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [version, setVersion] = useState(1);
  const [day, setDay] = useState(0);
  const [timeline, setTimeline] = useState();
  const [wrapped, setWrapped] = useState([]);
  const [error, setError] = useState('');
  const pollTimer = useRef();

  useEffect(() => {
    restoreSession();
    return () => clearTimeout(pollTimer.current);
  }, []);

  async function restoreSession() {
    try {
      const session = await request('/api/session');
      setVersion(session.version);
      setProposals(session.proposals || []);
      if (session.importRun) {
        setRunId(session.importRun.id);
        const done = (session.importRun.documents || []).filter((item) => item.status === 'done').length;
        setProgress(done / 24 * 100);
        if (session.importRun.status === 'ready') {
          setReady(true);
          await Promise.all([loadTimeline(0), loadWrapped()]);
        } else if (['ingesting', 'indexing'].includes(session.importRun.status)) poll(session.importRun.id);
        else setStatus(session.importRun.status);
      }
    } catch (cause) { setError(cause.message); }
    finally { setHydrating(false); }
  }

  async function poll(id) {
    try {
      const data = await request(`/api/import/${id}`);
      const done = (data.documents || []).filter((item) => item.status === 'done').length;
      setProgress(done / 24 * 100);
      setStatus(data.status === 'ready' ? 'Story ready.' : `Indexing ${done} of 24 moments...`);
      if (data.status === 'ready') {
        setReady(true); setVersion(data.version); setProposals(data.proposals);
        await Promise.all([loadTimeline(0), loadWrapped()]);
      } else if (!['failed', 'timeout'].includes(data.status)) pollTimer.current = setTimeout(() => poll(id), 500);
    } catch (cause) { setError(cause.message); }
  }

  async function startImport() {
    setError('');
    try { const data = await request('/api/import', { method: 'POST' }); setRunId(data.runId); poll(data.runId); }
    catch (cause) { setError(cause.message); }
  }

  async function retryImport() {
    try { await request(`/api/import/${runId}/retry`, { method: 'POST' }); poll(runId); }
    catch (cause) { setError(cause.message); }
  }

  async function decide(proposal, action) {
    let displayText;
    if (action === 'edit') { displayText = window.prompt('Edit display text only', proposal.displayText); if (displayText === null) return; }
    try {
      const data = await request(`/api/proposals/${encodeURIComponent(proposal.id)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, displayText, version }) });
      setVersion(data.version);
      setProposals((items) => items.map((item) => item.id === proposal.id ? data.proposal : item));
      loadWrapped();
    } catch (cause) { setError(cause.message); }
  }

  async function loadTimeline(index) {
    setDay(index);
    try { setTimeline(await request(`/api/timeline?day=${dates[index]}&q=${encodeURIComponent('Kyoto promise and relationship changes')}`)); }
    catch (cause) { setError(cause.message); }
  }

  async function deleteEvidence(id) {
    try { await request(`/api/evidence/${encodeURIComponent(id)}`, { method: 'DELETE' }); await Promise.all([loadTimeline(day), loadWrapped()]); }
    catch (cause) { setError(cause.message); }
  }

  async function loadWrapped() {
    try { setWrapped((await request('/api/wrapped')).cards); }
    catch (cause) { setError(cause.message); }
  }

  async function addCheckin(text) {
    const data = await request('/api/checkins', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ day: 20270701, text }) });
    setVersion(data.version);
    if (data.proposal) setProposals((items) => [...items, data.proposal]);
    return data;
  }

  const pending = proposals.filter((item) => item.status === 'pending');
  const confirmed = proposals.filter((item) => item.status === 'confirmed');
  const value = { runId, progress, status, ready, hydrating, proposals, pending, confirmed, version, day, timeline, wrapped, error, clearError: () => setError(''), startImport, retryImport, decide, loadTimeline, deleteEvidence, addCheckin };
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export const useAppData = () => useContext(AppDataContext);
