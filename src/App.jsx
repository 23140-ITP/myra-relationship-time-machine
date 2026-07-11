import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import * as Accordion from '@radix-ui/react-accordion';
import * as Dialog from '@radix-ui/react-dialog';
import * as Slider from '@radix-ui/react-slider';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircledIcon, ClockIcon, Cross2Icon, DashboardIcon, HamburgerMenuIcon, LockClosedIcon, MagicWandIcon } from '@radix-ui/react-icons';
import { AppDataProvider, hints, labels, useAppData } from './AppData.jsx';

const navItems = [
  ['/app/overview', 'Overview', DashboardIcon],
  ['/app/review', 'Review', CheckCircledIcon],
  ['/app/timeline', 'Time Machine', ClockIcon],
  ['/app/wrapped', 'Wrapped', MagicWandIcon],
];

function Brand() { return <span className="brand"><span className="brand-mark">M</span>MYRA</span>; }

function MarketingPage() {
  const features = [
    ['Reconstruct', 'Turn scattered dated moments into one dependable relationship history.'],
    ['Review', 'Approve what Supermemory discovers before it becomes part of the story.'],
    ['Travel', 'Move through turning points and see only what was known at that time.'],
    ['Understand', 'See promises, repair patterns, milestones, and what deserves attention next.'],
  ];
  return <div className="marketing">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header shell"><Brand /><nav className="marketing-nav" aria-label="Main navigation"><a href="#features">Features</a><a href="#privacy">Privacy</a><Link className="button-link" to="/app/overview">Open App</Link></nav></header>
    <main id="main" className="shell">
      <section className="hero"><div><h1>Remember what changed. <em>See what stayed.</em></h1></div><div className="hero-copy"><p className="lede">MYRA turns scattered moments into a relationship you can travel through, without sending the story beyond your machine.</p><Link className="button-link" to="/app/overview">Open App <ArrowRightIcon /></Link></div></section>
      <section id="features" className="marketing-section"><div className="marketing-heading"><h2>One story. Four ways to understand it.</h2><p>MYRA keeps the emotional work focused, inspectable, and grounded in evidence.</p></div><div className="feature-list">{features.map(([title, copy], index) => <article className="feature-row" key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
      <section id="privacy" className="privacy-band"><div><LockClosedIcon /><h2>Your relationship stays local.</h2></div><p>MYRA runs against Supermemory Local. The product is designed around evidence you can inspect, correct, and delete.</p></section>
      <section className="final-cta"><h2>Give the past somewhere useful to go.</h2><Link className="button-link" to="/app/overview">Open App <ArrowRightIcon /></Link></section>
    </main>
    <footer className="shell marketing-footer"><Brand /><span>Relationship memory, on your device.</span></footer>
  </div>;
}

function SidebarNav({ mobile = false }) {
  const { pending } = useAppData();
  const location = useLocation();
  const links = <>{navItems.map(([to, label, Icon]) => {
    const active = location.pathname === to;
    const link = <Link to={to} className={`side-link ${active ? 'active' : ''}`} aria-label={label} aria-current={active ? 'page' : undefined}><Icon /><span>{label}</span>{label === 'Review' && pending.length ? <b>{pending.length}</b> : null}</Link>;
    return mobile ? <Dialog.Close asChild key={to}>{link}</Dialog.Close> : <span key={to}>{link}</span>;
  })}</>;
  return <><nav className="side-nav" aria-label="App navigation">{links}</nav><div className="side-footer"><span className="local-status"><i />Private to this device</span><Link to="/"><ArrowLeftIcon /> Back to website</Link></div></>;
}

function AppShell() {
  const { error, clearError } = useAppData();
  return <div className="app-shell">
    <a className="skip-link" href="#app-content">Skip to content</a>
    <aside className="sidebar"><Brand /><SidebarNav /></aside>
    <header className="mobile-header"><Brand /><Dialog.Root><Dialog.Trigger asChild><button className="icon-button" aria-label="Open navigation"><HamburgerMenuIcon /></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="mobile-drawer"><div className="drawer-head"><Dialog.Title>Navigate MYRA</Dialog.Title><Dialog.Close asChild><button className="icon-button" aria-label="Close navigation"><Cross2Icon /></button></Dialog.Close></div><SidebarNav mobile /></Dialog.Content></Dialog.Portal></Dialog.Root></header>
    <main className="app-main" id="app-content">{error ? <div className="global-error" role="alert"><span>{error}</span><button className="secondary" onClick={clearError}>Dismiss</button></div> : null}<Outlet /></main>
  </div>;
}

function PageHeader({ title, description, action }) {
  const heading = useRef();
  const location = useLocation();
  useEffect(() => {
    const focusTimer = window.setTimeout(() => heading.current?.focus(), 75);
    return () => window.clearTimeout(focusTimer);
  }, [location.pathname]);
  return <header className="page-header"><div><h1 ref={heading} tabIndex="-1">{title}</h1><p>{description}</p></div>{action}</header>;
}

function NeedsStory({ children }) {
  const { ready, hydrating } = useAppData();
  if (hydrating) return <div className="page-loading" aria-live="polite">Restoring your story...</div>;
  if (!ready) return <section className="empty-state"><h2>Reconstruct a story first.</h2><p>Import the fictional Maya and Ari history from Overview to unlock this workspace.</p><Link className="button-link" to="/app/overview">Go to Overview</Link></section>;
  return children;
}

function OverviewPage() {
  const { runId, progress, status, ready, hydrating, pending, timeline, error, startImport, retryImport } = useAppData();
  return <><PageHeader title="Overview" description="Start the story, then see what needs your attention." />{hydrating ? <div className="page-loading">Restoring your story...</div> : ready ? <div className="overview-grid"><section className="summary-card primary-summary"><span className="eyebrow">Current chapter</span><h2>{timeline?.phase || 'Story ready'}</h2><p>24 moments reconstructed and ready to explore.</p><Link to="/app/timeline">Open Time Machine <ArrowRightIcon /></Link></section><section className="summary-card"><span className="eyebrow">Needs review</span><strong>{pending.length}</strong><p>{pending.length === 1 ? 'discovery is waiting for you.' : 'discoveries are waiting for you.'}</p><Link to="/app/review">Review discoveries <ArrowRightIcon /></Link></section><section className="next-actions"><h2>Continue the story</h2><div><Link to="/app/timeline">Add a relationship check-in</Link><Link to="/app/wrapped">See Relationship Wrapped</Link></div></section></div> : <section className="setup-card"><div><span className="eyebrow">Demo story</span><h2>Maya and Ari, from first spark to Kyoto.</h2><p>Import 24 fictional dated moments. Supermemory discovers the threads; you decide what becomes true.</p></div><div className="setup-action">{runId ? <><strong>{status || 'Starting import...'}</strong><div className="progress"><span style={{ width: `${progress}%` }} /></div>{['failed', 'timeout'].some((value) => status.includes(value)) ? <button className="secondary" onClick={retryImport}>Retry failed moments</button> : null}</> : <button onClick={startImport}>Import their story</button>}{error ? <p className="error" role="alert">{error}</p> : null}</div></section>}</>;
}

function ReviewPage() {
  const { pending, confirmed, decide } = useAppData();
  return <><PageHeader title="Review" description="Confirm what the memory means before it becomes part of the story." action={<span className="page-count">{pending.length} to decide</span>} /><NeedsStory><div className="review-page"><section><h2>Waiting for you</h2><div className="proposals">{pending.length ? pending.map((item) => <article className="proposal" key={item.id}><div><span className="meta">{item.kind} · {item.occurredDay}</span><p>{item.displayText}</p></div><div className="actions"><button onClick={() => decide(item, 'confirm')}>Confirm</button><button className="secondary" onClick={() => decide(item, 'edit')}>Edit</button><button className="secondary" onClick={() => decide(item, 'reject')}>Reject</button></div></article>) : <div className="inline-empty"><CheckCircledIcon /><p>Everything discovered so far has been reviewed.</p></div>}</div></section><Accordion.Root className="archive" type="single" collapsible><Accordion.Item value="confirmed"><Accordion.Header><Accordion.Trigger className="accordion-trigger">Confirmed memories <span>{confirmed.length}</span></Accordion.Trigger></Accordion.Header><Accordion.Content className="accordion-content"><div className="archive-list">{confirmed.map((item) => <article className="archive-item" key={item.id}><span className="meta">{item.kind} · {item.occurredDay}</span><p>{item.displayText}</p></article>)}</div></Accordion.Content></Accordion.Item></Accordion.Root></div></NeedsStory></>;
}

function TimelinePage() {
  const { day, timeline, loadTimeline, deleteEvidence, addCheckin } = useAppData();
  const [text, setText] = useState('We argued because Ari cancelled our call again');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage('Saving check-in...');
    try {
      const data = await addCheckin(text);
      setMessage(data.proposal ? 'Saved. Review the proposed update.' : 'Saved; no structured update found.');
    } catch (cause) {
      setMessage(cause.message);
    } finally {
      setSubmitting(false);
    }
  }
  return <><PageHeader title="Time Machine" description="Travel through what Maya and Ari knew at each turning point." /><NeedsStory><div className="timeline-page"><section className="timeline-controls"><div className="date-nav">{labels.map((label, index) => <button key={label} className={`date-button ${day === index ? 'active' : ''}`} onClick={() => loadTimeline(index)}><span>{label}</span><small>{hints[index]}</small></button>)}</div><div className="timeline-label"><span>Relationship date</span><strong>{labels[day]}</strong></div><Slider.Root className="slider-root" min={0} max={2} step={1} value={[day]} onValueChange={([value]) => loadTimeline(value)}><Slider.Track className="slider-track"><Slider.Range className="slider-range" /></Slider.Track><Slider.Thumb className="slider-thumb" aria-label="Relationship date" /></Slider.Root></section><div className="timeline-content"><section className="state-story"><span className="meta">{labels[day]}</span><h2>{timeline?.phase}</h2><div className="promises">{Object.entries(timeline?.promises || {}).map(([key, value]) => <div className="promise" key={key}><strong>{key.replaceAll('_', ' ')}</strong><span>{value}</span></div>)}</div></section><section className="evidence-column"><h2>Supporting memories</h2><Accordion.Root className="evidence" type="multiple">{(timeline?.evidence || []).map((item, index) => { const metadata = item.metadata || item.document?.metadata || {}; const fullText = item.memory || item.content || item.summary || 'Memory from this chapter'; const source = metadata.sourceCustomId || item.sourceCustomId; return <Accordion.Item value={`evidence-${index}`} key={source || index}><Accordion.Header><Accordion.Trigger className="accordion-trigger">{fullText.length > 92 ? `${fullText.slice(0, 89)}...` : fullText}<span>+</span></Accordion.Trigger></Accordion.Header><Accordion.Content className="accordion-content"><p>{fullText}</p>{source ? <button className="secondary" onClick={() => deleteEvidence(source)}>Delete evidence</button> : null}</Accordion.Content></Accordion.Item>; })}</Accordion.Root><form className="checkin" onSubmit={submit}><label htmlFor="checkin">Continue the story</label><p>Add a moment and let MYRA detect whether a promise changed.</p><div><input id="checkin" value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} required /><button disabled={submitting}>{submitting ? 'Saving...' : 'Add check-in'}</button></div><span className="status" aria-live="polite">{message}</span></form></section></div></div></NeedsStory></>;
}

function WrappedPage() {
  const { wrapped } = useAppData();
  return <><PageHeader title="Relationship Wrapped" description="The promises, patterns, and places that shaped the story." /><NeedsStory>{wrapped.length ? <div className="wrapped-grid">{wrapped.map((card) => <article className="wrapped-card" key={card.title}><span className="meta">{card.title}</span><h2>{card.title === 'Promise that followed you' && card.value.includes('Kyoto promise fulfilled') ? 'The Kyoto promise' : card.value.slice(0, 120)}</h2><p>Grounded in {card.evidenceCustomIds.length} evidence source{card.evidenceCustomIds.length === 1 ? '' : 's'}</p></article>)}</div> : <section className="empty-state"><h2>Wrapped needs more confirmed history.</h2><p>Review MYRA’s discoveries to build an evidence-backed summary.</p><Link className="button-link" to="/app/review">Go to Review</Link></section>}</NeedsStory></>;
}

export default function App() {
  return <BrowserRouter><Routes><Route path="/" element={<MarketingPage />} /><Route path="/app" element={<AppDataProvider><AppShell /></AppDataProvider>}><Route index element={<Navigate to="overview" replace />} /><Route path="overview" element={<OverviewPage />} /><Route path="review" element={<ReviewPage />} /><Route path="timeline" element={<TimelinePage />} /><Route path="wrapped" element={<WrappedPage />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></BrowserRouter>;
}
