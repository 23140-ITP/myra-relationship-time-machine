import { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import * as Accordion from "@radix-ui/react-accordion";
import * as Dialog from "@radix-ui/react-dialog";
import * as Slider from "@radix-ui/react-slider";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircledIcon,
  ClockIcon,
  Cross2Icon,
  DashboardIcon,
  HamburgerMenuIcon,
  LockClosedIcon,
  MagicWandIcon,
} from "@radix-ui/react-icons";
import { AppDataProvider, hints, labels, useAppData } from "./AppData.jsx";

const navItems = [
  ["/app/overview", "Overview", DashboardIcon],
  ["/app/review", "Review", CheckCircledIcon],
  ["/app/timeline", "Time Machine", ClockIcon],
  ["/app/wrapped", "Wrapped", MagicWandIcon],
];

function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">M</span>MYRA
    </span>
  );
}

const demoChapters = [
  { date: "May 20, 2024", chapter: "Talking", promise: "Made", evidence: "Ari promises Maya Kyoto when the internship ends." },
  { date: "October 18, 2025", chapter: "Long Distance", promise: "Deferred", evidence: "They agree Kyoto can wait until distance feels lighter." },
  { date: "March 12, 2027", chapter: "Living Together", promise: "Fulfilled", evidence: "Maya meets Ari beneath the clock at Kyoto Station." },
];

function MarketingDemo() {
  const [selected, setSelected] = useState(0);
  const chapter = demoChapters[selected];
  return (
    <div className="product-demo" aria-label="Interactive fictional MYRA timeline">
      <div className="demo-chrome"><span><i />Fictional demo</span><span>Private to this device</span></div>
      <div className="demo-body">
        <div className="demo-sidebar"><Brand /><span>Overview</span><b>Time Machine</b><span>Review</span><span>Wrapped</span></div>
        <div className="demo-stage" aria-live="polite">
          <div className="demo-heading"><span>Relationship timeline</span><strong>{chapter.date}</strong></div>
          <div className="demo-dates" role="group" aria-label="Choose a turning point">
            {demoChapters.map((item, index) => <button key={item.date} className={selected === index ? "active" : ""} aria-pressed={selected === index} onClick={() => setSelected(index)}><span>{String(index + 1).padStart(2, "0")}</span>{item.date}</button>)}
          </div>
          <div className="demo-result" key={chapter.date}>
            <div><small>Current chapter</small><h3>{chapter.chapter}</h3><p>The past only shows what Maya and Ari knew at this point.</p></div>
            <div className="demo-evidence"><small>Kyoto promise · {chapter.promise}</small><p>{chapter.evidence}</p><span>Evidence attached ↗</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketingNav() {
  const links = [["#product", "Product"], ["#how-it-works", "How it works"], ["#privacy", "Privacy"], ["#faq", "FAQ"]];
  return <header className="site-header shell"><a href="#top" className="brand-link" aria-label="MYRA home"><Brand /></a><nav className="marketing-nav" aria-label="Main navigation">{links.map(([href, label]) => <a href={href} key={href}>{label}</a>)}<Link className="button-link" to="/app/overview">Open App</Link></nav><Dialog.Root><Dialog.Trigger asChild><button className="marketing-menu icon-button" aria-label="Open navigation"><HamburgerMenuIcon /></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="mobile-drawer marketing-drawer"><div className="drawer-head"><Dialog.Title>Explore MYRA</Dialog.Title><Dialog.Close asChild><button className="icon-button" aria-label="Close navigation"><Cross2Icon /></button></Dialog.Close></div><nav aria-label="Mobile navigation">{links.map(([href, label]) => <Dialog.Close asChild key={href}><a href={href}>{label}</a></Dialog.Close>)}</nav><Dialog.Close asChild><Link className="button-link" to="/app/overview">Open App <ArrowRightIcon /></Link></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root></header>;
}

function MarketingPage() {
  return (
    <div className="marketing" id="top">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <MarketingNav />
      <main id="main">
        <section className="saas-hero shell">
          <div className="hero-title"><span className="hero-kicker">Private relationship intelligence</span><h1>Your relationship has a memory. <em>Keep it yours.</em></h1></div>
          <div className="hero-pitch"><p>MYRA stands for Mapping Your Relationship’s Adventures. It reconstructs the moments that shaped your relationship, lets you review every conclusion, and keeps your relationship record on your machine.</p><div className="hero-actions"><Link className="button-link" to="/app/overview">Open App <ArrowRightIcon /></Link><a className="text-link" href="#product">See how it works ↓</a></div><span className="trust-line"><LockClosedIcon />Local-first storage. AI extraction uses your configured model provider.</span></div>
        </section>

        <section id="product" className="product-proof shell"><div className="section-intro"><span>See the product</span><h2>A relationship you can move through.</h2><p>Choose a turning point. MYRA changes the chapter, promise state, and available evidence without letting the future rewrite the past.</p></div><MarketingDemo /></section>

        <section className="thesis-band"><div className="shell thesis-grid"><h2>Most AI gives you a conclusion. MYRA gives you the history behind it.</h2><div className="comparison"><div><span>Ordinary AI</span><p>One flattened summary, detached from when things happened.</p></div><div><span>MYRA</span><p>Reviewed discoveries, dated evidence, and conclusions you can correct.</p></div></div></div></section>

        <section id="how-it-works" className="process-section shell"><div className="section-intro"><span>How it works</span><h2>From scattered moments to a story you trust.</h2></div><ol className="process-list"><li><span>01</span><h3>Import locally</h3><p>Bring dated moments into Supermemory on your device.</p></li><li><span>02</span><h3>Review discoveries</h3><p>Confirm, edit, or reject every phase, promise, and repair.</p></li><li><span>03</span><h3>Travel the story</h3><p>Move through time and inspect the evidence behind each chapter.</p></li></ol></section>

        <section className="story-sections shell" aria-label="MYRA product capabilities">
          <article className="story-row"><div className="story-copy"><span>Review</span><h2>Nothing becomes true without you.</h2><p>MYRA proposes what changed. You decide what belongs in the relationship record.</p></div><div className="review-fragment"><span>Discovery · Promise</span><p>“Kyoto, when the internship ends.”</p><div><button>Confirm</button><button className="secondary">Edit</button><button className="secondary">Reject</button></div></div></article>
          <article className="story-row reverse"><div className="story-copy"><span>Time Machine</span><h2>The past only knows what it knew then.</h2><p>Every chapter is rebuilt only from evidence available at that date, never from what happened later.</p></div><div className="cutoff-fragment"><div><span>May 2024</span><b>Promise made</b></div><div><span>October 2025</span><b>Promise deferred</b></div><div><span>March 2027</span><b>Promise fulfilled</b></div></div></article>
          <article className="story-row"><div className="story-copy"><span>Wrapped</span><h2>A summary that can show its work.</h2><p>Your relationship patterns stay tied to evidence. Delete the source, and dependent claims disappear too.</p></div><div className="wrapped-fragment"><small>Promise that followed you</small><strong>The Kyoto promise</strong><span>Grounded in 3 evidence sources</span><a href="#privacy">Inspect how privacy works ↗</a></div></article>
        </section>

        <section id="privacy" className="privacy-section"><div className="shell"><div className="privacy-lead"><LockClosedIcon /><span>Local-first by design</span><h2>Your record stays close. Your choices stay visible.</h2><p>MYRA stores and searches your relationship history locally. Supermemory uses your configured OpenRouter model for AI extraction.</p></div><div className="architecture-flow" aria-label="Local-first data flow"><span>Browser</span><i>→</i><span>MYRA<br /><small>localhost</small></span><i>→</i><span>Supermemory<br /><small>local storage</small></span><i>→</i><span>OpenRouter<br /><small>AI extraction</small></span></div><div className="privacy-promises"><p><b>Local record</b>Your reviewed relationship history remains on your machine.</p><p><b>Transparent AI</b>Text used for extraction is sent to your configured OpenRouter model.</p><p><b>Evidence control</b>Inspect, correct, and delete what supports every conclusion.</p></div></div></section>

        <section className="facts-section shell"><div><strong>24</strong><span>fictional moments</span></div><div><strong>3</strong><span>turning points</span></div><div><strong>100%</strong><span>date-cutoff safe</span></div><div><strong>MIT</strong><span>open-source license</span></div><p>Verifiable product facts, without borrowed logos or invented testimonials. <a href="https://github.com/23140-ITP/myra-relationship-time-machine">View the source ↗</a></p></section>

        <section id="faq" className="faq-section shell"><div className="section-intro"><span>Questions, answered</span><h2>Before you trust MYRA with a story.</h2></div><Accordion.Root type="single" collapsible className="faq-list">{[
          ["Is MYRA therapy?", "No. MYRA is a memory and reflection tool. It does not diagnose, prescribe, or replace professional care."],
          ["Is the demo based on real people?", "No. Maya and Ari are fictional, and the included 24 moments exist only to demonstrate the product."],
          ["Does anything leave my device?", "Your stored relationship record stays local. Text used for AI extraction is sent to the OpenRouter model configured in Supermemory."],
          ["Can I correct what MYRA concludes?", "Yes. Discoveries remain proposals until you confirm them, and you can edit or reject each one."],
          ["What happens when I delete evidence?", "The source is removed from Supermemory and any confirmed claims that depend on it are invalidated."],
        ].map(([question, answer]) => <Accordion.Item value={question} key={question}><Accordion.Header><Accordion.Trigger className="accordion-trigger"><span>{question}</span><span aria-hidden="true">+</span></Accordion.Trigger></Accordion.Header><Accordion.Content className="accordion-content"><p>{answer}</p></Accordion.Content></Accordion.Item>)}</Accordion.Root></section>

        <section className="saas-final shell"><h2>Keep the story. <em>Keep control of it.</em></h2><Link className="button-link" to="/app/overview">Open App <ArrowRightIcon /></Link></section>
      </main>
      <footer className="shell marketing-footer">
        <div><Brand /><span>Relationship memory, on your device.</span></div><nav aria-label="Footer navigation"><a href="https://github.com/23140-ITP/myra-relationship-time-machine">GitHub</a><a href="https://github.com/23140-ITP/myra-relationship-time-machine/blob/main/LICENSE">MIT License</a><a href="#privacy">Privacy architecture</a><a href="#top">Back to top ↑</a></nav>
      </footer>
    </div>
  );
}

function SidebarNav({ mobile = false }) {
  const { pending } = useAppData();
  const location = useLocation();
  const links = (
    <>
      {navItems.map(([to, label, Icon]) => {
        const active = location.pathname === to;
        const link = (
          <Link
            to={to}
            className={`side-link ${active ? "active" : ""}`}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            <Icon />
            <span>{label}</span>
            {label === "Review" && pending.length ? (
              <b>{pending.length}</b>
            ) : null}
          </Link>
        );
        return mobile ? (
          <Dialog.Close asChild key={to}>
            {link}
          </Dialog.Close>
        ) : (
          <span key={to}>{link}</span>
        );
      })}
    </>
  );
  return (
    <>
      <nav className="side-nav" aria-label="App navigation">
        {links}
      </nav>
      <div className="side-footer">
        <span className="local-status">
          <i />
          Private to this device
        </span>
        <Link to="/">
          <ArrowLeftIcon /> Back to website
        </Link>
      </div>
    </>
  );
}

function AppShell() {
  const { error, clearError } = useAppData();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#app-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <SidebarNav />
      </aside>
      <header className="mobile-header">
        <Brand />
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <button className="icon-button" aria-label="Open navigation">
              <HamburgerMenuIcon />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="mobile-drawer">
              <div className="drawer-head">
                <Dialog.Title>Navigate MYRA</Dialog.Title>
                <Dialog.Close asChild>
                  <button className="icon-button" aria-label="Close navigation">
                    <Cross2Icon />
                  </button>
                </Dialog.Close>
              </div>
              <SidebarNav mobile />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>
      <main className="app-main" id="app-content">
        {error ? (
          <div className="global-error" role="alert">
            <span>{error}</span>
            <button className="secondary" onClick={clearError}>
              Dismiss
            </button>
          </div>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
}

function PageHeader({ title, description, action }) {
  const heading = useRef();
  const location = useLocation();
  useEffect(() => {
    const focusTimer = window.setTimeout(() => heading.current?.focus(), 75);
    return () => window.clearTimeout(focusTimer);
  }, [location.pathname]);
  return (
    <header className="page-header">
      <div>
        <h1 ref={heading} tabIndex="-1">
          {title}
        </h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function NeedsStory({ children }) {
  const { ready, hydrating } = useAppData();
  if (hydrating)
    return (
      <div className="page-loading" aria-live="polite">
        Restoring your story...
      </div>
    );
  if (!ready)
    return (
      <section className="empty-state">
        <h2>Reconstruct a story first.</h2>
        <p>
          Import the fictional Maya and Ari history from Overview to unlock this
          workspace.
        </p>
        <Link className="button-link" to="/app/overview">
          Go to Overview
        </Link>
      </section>
    );
  return children;
}

function OverviewPage() {
  const {
    runId,
    progress,
    status,
    ready,
    hydrating,
    pending,
    timeline,
    error,
    startImport,
    retryImport,
  } = useAppData();
  return (
    <>
      <PageHeader
        title="Overview"
        description="Start the story, then see what needs your attention."
      />
      {hydrating ? (
        <div className="page-loading">Restoring your story...</div>
      ) : ready ? (
        <div className="overview-grid">
          <section className="summary-card primary-summary">
            <span className="eyebrow">Current chapter</span>
            <h2>{timeline?.phase || "Story ready"}</h2>
            <p>24 moments reconstructed and ready to explore.</p>
            <Link to="/app/timeline">
              Open Time Machine <ArrowRightIcon />
            </Link>
          </section>
          <section className="summary-card">
            <span className="eyebrow">Needs review</span>
            <strong>{pending.length}</strong>
            <p>
              {pending.length === 1
                ? "discovery is waiting for you."
                : "discoveries are waiting for you."}
            </p>
            <Link to="/app/review">
              Review discoveries <ArrowRightIcon />
            </Link>
          </section>
          <section className="next-actions">
            <h2>Continue the story</h2>
            <div>
              <Link to="/app/timeline">Add a relationship check-in</Link>
              <Link to="/app/wrapped">See Relationship Wrapped</Link>
            </div>
          </section>
        </div>
      ) : (
        <section className="setup-card">
          <div>
            <span className="eyebrow">Demo story</span>
            <h2>Maya and Ari, from first spark to Kyoto.</h2>
            <p>
              Import 24 fictional dated moments. Supermemory discovers the
              threads; you decide what becomes true.
            </p>
          </div>
          <div className="setup-action">
            {runId ? (
              <>
                <strong>{status || "Starting import..."}</strong>
                <div className="progress">
                  <span style={{ width: `${progress}%` }} />
                </div>
                {["failed", "timeout"].some((value) =>
                  status.includes(value),
                ) ? (
                  <button className="secondary" onClick={retryImport}>
                    Retry failed moments
                  </button>
                ) : null}
              </>
            ) : (
              <button onClick={startImport}>Import their story</button>
            )}
            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </section>
      )}
    </>
  );
}

function ReviewPage() {
  const { pending, confirmed, decide } = useAppData();
  return (
    <>
      <PageHeader
        title="Review"
        description="Confirm what the memory means before it becomes part of the story."
        action={<span className="page-count">{pending.length} to decide</span>}
      />
      <NeedsStory>
        <div className="review-page">
          <section>
            <h2>Waiting for you</h2>
            <div className="proposals">
              {pending.length ? (
                pending.map((item) => (
                  <article className="proposal" key={item.id}>
                    <div>
                      <span className="meta">
                        {item.kind} · {item.occurredDay}
                      </span>
                      <p>{item.displayText}</p>
                    </div>
                    <div className="actions">
                      <button onClick={() => decide(item, "confirm")}>
                        Confirm
                      </button>
                      <button
                        className="secondary"
                        onClick={() => decide(item, "edit")}
                      >
                        Edit
                      </button>
                      <button
                        className="secondary"
                        onClick={() => decide(item, "reject")}
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="inline-empty">
                  <CheckCircledIcon />
                  <p>Everything discovered so far has been reviewed.</p>
                </div>
              )}
            </div>
          </section>
          <Accordion.Root className="archive" type="single" collapsible>
            <Accordion.Item value="confirmed">
              <Accordion.Header>
                <Accordion.Trigger className="accordion-trigger">
                  Confirmed memories <span>{confirmed.length}</span>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="accordion-content">
                <div className="archive-list">
                  {confirmed.map((item) => (
                    <article className="archive-item" key={item.id}>
                      <span className="meta">
                        {item.kind} · {item.occurredDay}
                      </span>
                      <p>{item.displayText}</p>
                    </article>
                  ))}
                </div>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        </div>
      </NeedsStory>
    </>
  );
}

function TimelinePage() {
  const { day, timeline, loadTimeline, deleteEvidence, addCheckin } =
    useAppData();
  const [text, setText] = useState(
    "We argued because Ari cancelled our call again",
  );
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage("Saving check-in…");
    try {
      const data = await addCheckin(text);
      setMessage(
        data.proposal
          ? "Saved. Review the proposed update."
          : "Saved; no structured update found.",
      );
    } catch (cause) {
      setMessage(cause.message);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Time Machine"
        description="Travel through what Maya and Ari knew at each turning point."
      />
      <NeedsStory>
        <div className="timeline-page">
          <section className="timeline-controls">
            <div className="date-nav">
              {labels.map((label, index) => (
                <button
                  key={label}
                  className={`date-button ${day === index ? "active" : ""}`}
                  aria-pressed={day === index}
                  onClick={() => loadTimeline(index)}
                >
                  <span>{label}</span>
                  <small>{hints[index]}</small>
                </button>
              ))}
            </div>
            <div className="timeline-label">
              <span>Relationship date</span>
              <strong>{labels[day]}</strong>
            </div>
            <Slider.Root
              className="slider-root"
              min={0}
              max={2}
              step={1}
              value={[day]}
              onValueChange={([value]) => loadTimeline(value)}
            >
              <Slider.Track className="slider-track">
                <Slider.Range className="slider-range" />
              </Slider.Track>
              <Slider.Thumb
                className="slider-thumb"
                aria-label="Relationship date"
              />
            </Slider.Root>
          </section>
          <div className="timeline-content">
            <section className="state-story">
              <span className="meta">{labels[day]}</span>
              <h2>{timeline?.phase}</h2>
              <div className="promises">
                {Object.entries(timeline?.promises || {}).map(
                  ([key, value]) => (
                    <div className="promise" key={key}>
                      <strong>{key.replaceAll("_", " ")}</strong>
                      <span>{value}</span>
                    </div>
                  ),
                )}
              </div>
            </section>
            <section className="evidence-column">
              <h2>Supporting memories</h2>
              <Accordion.Root className="evidence" type="multiple">
                {(timeline?.evidence || []).map((item, index) => {
                  const metadata =
                    item.metadata || item.document?.metadata || {};
              const fullText =
                item.chunk ||
                item.memory ||
                    item.content ||
                    item.summary ||
                    "Memory from this chapter";
                  const source = metadata.sourceCustomId || item.sourceCustomId;
                  return (
                    <Accordion.Item
                      value={`evidence-${index}`}
                      key={source || index}
                    >
                      <Accordion.Header>
                        <Accordion.Trigger className="accordion-trigger">
                    {fullText.length > 92
                      ? `${fullText.slice(0, 89)}…`
                            : fullText}
                        <span aria-hidden="true">+</span>
                        </Accordion.Trigger>
                      </Accordion.Header>
                      <Accordion.Content className="accordion-content">
                        <p>{fullText}</p>
                        {source ? (
                        <button
                          className="secondary"
                          onClick={() =>
                            window.confirm(
                              "Delete this evidence from MYRA? This cannot be undone.",
                            ) && deleteEvidence(source)
                          }
                        >
                          Delete Evidence
                          </button>
                        ) : null}
                      </Accordion.Content>
                    </Accordion.Item>
                  );
                })}
              </Accordion.Root>
              <form className="checkin" onSubmit={submit}>
                <label htmlFor="checkin">Continue the story</label>
                <p>
                  Add a moment and let MYRA detect whether a promise changed.
                </p>
                <div>
              <input
                id="checkin"
                name="relationshipCheckin"
                autoComplete="off"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    maxLength={1000}
                    required
                  />
                  <button disabled={submitting}>
                {submitting ? "Saving…" : "Add Check-In"}
                  </button>
                </div>
                <span className="status" aria-live="polite">
                  {message}
                </span>
              </form>
            </section>
          </div>
        </div>
      </NeedsStory>
    </>
  );
}

function WrappedPage() {
  const { wrapped } = useAppData();
  return (
    <>
      <PageHeader
        title="Relationship Wrapped"
        description="The promises, patterns, and places that shaped the story."
      />
      <NeedsStory>
        {wrapped.length ? (
          <div className="wrapped-grid">
            {wrapped.map((card) => (
              <article className="wrapped-card" key={card.title}>
                <span className="meta">{card.title}</span>
                <h2>
                  {card.title === "Promise that followed you" &&
                  card.value.includes("Kyoto promise fulfilled")
                    ? "The Kyoto promise"
                    : card.value.slice(0, 120)}
                </h2>
                <p>
                  Grounded in {card.evidenceCustomIds.length} evidence source
                  {card.evidenceCustomIds.length === 1 ? "" : "s"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <section className="empty-state">
            <h2>Wrapped needs more confirmed history.</h2>
            <p>
              Review MYRA’s discoveries to build an evidence-backed summary.
            </p>
            <Link className="button-link" to="/app/review">
              Go to Review
            </Link>
          </section>
        )}
      </NeedsStory>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MarketingPage />} />
        <Route
          path="/app"
          element={
            <AppDataProvider>
              <AppShell />
            </AppDataProvider>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="wrapped" element={<WrappedPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
