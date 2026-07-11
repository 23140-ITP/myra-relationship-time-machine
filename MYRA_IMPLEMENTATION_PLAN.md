# MYRA Implementation Plan

Status: ENGINEERING REVIEW COMPLETE
Product: MYRA — Mapping Your Relationship’s Adventures
Target: Supermemory Local Hackathon, 4–5 day build
Primary platform: Windows 11, localhost-only
Source design: `C:\Users\yashd\.gstack\projects\super-memory\yashd-master-design-20260710-205335.md`

## Outcome

Ship one reproducible three-minute journey for the fictional couple Maya and Ari:

1. Import their curated dated conversation.
2. Review and confirm relationship phases and three promise threads.
3. Move a date slider and retrieve only memories known by that date.
4. Add one ongoing check-in and confirm its promise update.
5. Finish with six evidence-backed Relationship Wrapped cards.

The demo must use Supermemory Local for ingestion, memory extraction, storage, numeric date filtering, hybrid semantic search, and evidence deletion. No hosted Supermemory fallback is allowed.

## Engineering Decisions

1. **One Node app:** Express serves a static HTML/CSS/JavaScript frontend and the same-origin API. No React, Vite, frontend build, database, or client-side SDK.
2. **Local runtime:** before application implementation, run `npx supermemory@4.24.12 local --port 6767` natively on Windows. The pre-build gate requires add, status, memory discovery, filtered search, and delete to pass. Install WSL2 only if the native server fails that gate.
3. **Server-only credentials:** `SUPERMEMORY_API_KEY` and `SUPERMEMORY_API_URL` stay in `.env`; the browser only calls `/api/*`. MYRA binds to `127.0.0.1:3000`.
4. **Supermemory owns temporal filtering:** each of 24 dated conversation moments plus each check-in is a separate document with numeric `occurredDay` metadata. There is no local memory index and no exhaustive `topK` workaround.
5. **Supermemory discovers; the user confirms:** after ingestion, three semantic searches over Supermemory-extracted memories produce promise, milestone, and repair candidates. Confirmed phases, promise lifecycles, and Wrapped facts live in one small local JSON file.
6. **Serialized best-effort persistence:** the entire read → validate → reduce → temp-write → rename transaction is queued. This prevents overlapping mutations and torn writes without claiming database-grade crash durability.
7. **Real readiness:** import stays in progress until every required document reports `done`; `failed` documents are individually retryable. Time Machine and Wrapped remain disabled until ready.
8. **No second LLM integration:** Supermemory Local’s configured model performs memory extraction. MYRA turns its returned memory candidates into editable proposals, then uses deterministic state derivation and Wrapped templates after confirmation.
9. **Pinned contract:** use `supermemory@4.24.12`; after the Day 0 substrate rehearsal, pin the observed server version and response shapes in the README. Treat `done` and `failed` as terminal and every other documented or observed status as in progress.

## Eight Authored Files

Generated `package-lock.json` and runtime `.data/myra-state.json` do not count as authored architecture.

| # | File | Responsibility |
|---|------|----------------|
| 1 | `package.json` | Node 22 scripts and only two runtime dependencies: `express`, `supermemory` |
| 2 | `server.mjs` | Localhost server, routes, validation, import polling, atomic state store |
| 3 | `domain.mjs` | Pure parser, proposal reducer, phase/promise derivation, Wrapped card derivation |
| 4 | `public/index.html` | All three screens, styles, client interactions, loading/empty/error states |
| 5 | `fixtures/myra.json` | Transcript, supported check-ins, proposals, evidence, expected cutoff snapshots |
| 6 | `test/myra.test.mjs` | Node unit and API integration tests with an in-memory fake adapter |
| 7 | `README.md` | Windows-first setup, WSL fallback, ports, seed/reset, demo and test commands |
| 8 | `.github/workflows/ci.yml` | Node 22 install and built-in test/coverage check on every push |

Do not introduce classes, repositories, factories, interfaces, routers, controllers, state libraries, CSS frameworks, or configuration layers. Use exported functions and one plain adapter object.

## Runtime Topology

```text
┌─────────────────────────────────────────────────────────────────┐
│ Windows laptop                                                  │
│                                                                 │
│  Browser                                                        │
│  http://127.0.0.1:3000                                          │
│       │ same-origin fetch                                       │
│       ▼                                                         │
│  MYRA Node/Express                                              │
│  127.0.0.1:3000                                                 │
│       │ server-only bearer token                                │
│       ▼                                                         │
│  Supermemory Local                                              │
│  http://127.0.0.1:6767                                          │
│       │                                                         │
│       └── .supermemory/ local graph, embeddings, memories       │
│                                                                 │
│  .data/myra-state.json                                          │
│  confirmed relationship state only                              │
└─────────────────────────────────────────────────────────────────┘
```

If the native Supermemory server cannot pass the pre-build gate, only that process moves into WSL2. MYRA and the browser remain on Windows and still call `127.0.0.1:6767`.

### Extraction model choice

The current machine has no detected Ollama installation and its RAM/GPU capacity could not be read without elevation. Do not make a large local-model install part of the critical path. During the pre-build rehearsal, configure Supermemory with an already available provider key and disclose that model inference may leave the machine while embeddings, graph storage, and search stay local. If a suitable Ollama model is already proven on the machine, it may replace the provider without application changes. Do not claim “fully offline” unless the Ollama path is actually demonstrated.

## Supermemory Document Contract

The curated transcript contains exactly 24 unique dates. All contiguous messages from one date become one Supermemory document, keeping the corpus bounded while preserving a reliable date filter and evidence range.

```json
{
  "content": "Maya: What happens when the internship ends?\nAri: I'll take you to Kyoto.",
  "customId": "myra_maya_ari_20240520_a1b2c3d4",
  "containerTag": "relationship_maya_ari",
  "metadata": {
    "relationshipId": "maya_ari",
    "occurredDay": 20240520,
    "sourceCustomId": "myra_maya_ari_20240520_a1b2c3d4",
    "sourceLineStart": 41,
    "sourceLineEnd": 42,
    "kind": "conversation_moment"
  },
  "dreaming": "instant"
}
```

Rules:

- `customId = myra_<relationship>_<occurredDay>_<first 8 chars of SHA-256(normalized moment)>`.
- Metadata remains scalar because Supermemory filters do not accept nested metadata.
- `occurredDay` is numeric `YYYYMMDD`; cutoff comparison is inclusive and timezone-free.
- `dreaming: "instant"` keeps each dated source independently processable.
- `sourceCustomId` is repeated in metadata so hybrid results can map back to application evidence.
- Re-importing the identical fixture reuses the same `customId` values; app state also stores the remote document ID returned by ingestion.
- Changed fixture text produces a new hash and is treated as a new source; reset deletes prior fixture IDs first.
- Search uses `containerTag: "relationship_maya_ari"`, `searchMode: "hybrid"`, numeric `occurredDay <= D`, `limit: 8`, `threshold: 0.25`, and `rerank: false`.
- Reject any search result missing a known, non-deleted `sourceCustomId`; never infer provenance from result order.

## Local State Contract

```json
{
  "version": 1,
  "relationship": {
    "id": "maya_ari",
    "people": ["Maya", "Ari"]
  },
  "importRun": {
    "id": "run_...",
    "status": "idle|ingesting|ready|failed",
    "documents": [{
      "customId": "...",
      "remoteDocumentId": "...",
      "status": "queued|other-in-progress|done|failed",
      "deletedAt": null
    }]
  },
  "proposals": [],
  "events": [],
  "promises": []
}
```

`EvidenceRef` stores `{ sourceCustomId, sourceLineStart, sourceLineEnd, excerptHash }`. `customId` is stable application/evidence identity; `remoteDocumentId` is retained for status and deletion calls. The document registry includes every imported or check-in document whether or not it becomes event evidence.

Only confirmed proposals become events. The initial phase produces `phase_started`; the next three produce `phase_transition`. Promise updates use `made | kept | deferred | broken | repaired | fulfilled`. Events sort by `occurredDay`, then evidence `sourceLineStart`.

### Atomic state algorithm

```text
request mutation enters one transaction queue
  │
  ├── read current snapshot inside queue
  ├── validate against current version
  ├── apply pure reducer
  └── enqueue serialized write
          │
          ├── write .data/myra-state.json.tmp
          ├── rename temp → myra-state.json
          └── update in-memory snapshot

startup
  ├── valid JSON + version 1 → load
  ├── missing file → initialize empty state
  └── invalid JSON/version → preserve file, offer fixture reset
```

The app is single-user, but duplicate clicks and overlapping polling requests still exist. Serializing the complete transaction prevents lost updates without locks or a database. Temp-plus-rename is a pragmatic corruption reduction, not a durability guarantee.

## HTTP API

All successful responses are JSON. Errors use:

```json
{
  "error": {
    "code": "SUPERMEMORY_UNAVAILABLE",
    "message": "Supermemory Local is not reachable on port 6767.",
    "retryable": true
  }
}
```

| Method | Route | Behavior |
|--------|-------|----------|
| `GET` | `/api/health` | Reports MYRA state readiness and Supermemory connectivity; never exposes keys |
| `POST` | `/api/import` | Validates the bounded 24-moment fixture before writes, creates stable IDs, ingests with concurrency 3, returns `202` + run ID |
| `GET` | `/api/import/:runId` | Returns per-document status and aggregate progress; unknown run is `404` |
| `POST` | `/api/import/:runId/retry` | Retries only failed documents with their existing stable IDs |
| `POST` | `/api/proposals/:id` | `confirm`, display-text edit, or `reject`; evidence date/type are immutable and stale state version returns `409` |
| `POST` | `/api/checkins` | Ingests a dated check-in, polls its remote ID to `done`, searches for the affected prior promise, and asks the user to choose/confirm the lifecycle update |
| `GET` | `/api/timeline?day=YYYYMMDD&q=text` | Derives phase/promises at cutoff and performs filtered hybrid search |
| `DELETE` | `/api/evidence/:customId` | Deletes by stored remote ID, verifies disappearance, tombstones the source, invalidates cited events, and recomputes cards |
| `POST` | `/api/reset` | Deletes every non-deleted document in the authoritative registry and restores empty state |

Static `GET /` serves `public/index.html`. Unknown API routes return JSON `404`; unknown browser routes return the app shell only for `GET` requests accepting HTML.

### Validation boundaries

- Bind server to `127.0.0.1` only.
- Start with `node --env-file=.env server.mjs`; refuse startup when required environment variables are missing.
- Set JSON/text body limit to 1 MB.
- Transcript grammar is exactly `YYYY-MM-DD HH:mm - Speaker: message`, UTF-8, one physical line per message.
- Normalize CRLF to LF before hashing; reject NUL bytes and malformed UTF-8.
- Require only speakers `Maya` and `Ari` for structured fixture proposals.
- Validate `YYYYMMDD` is a real calendar date and within fixture bounds.
- Proposal actions are an explicit allowlist; edits may change display copy only, never evidence day, type, or source.
- Evidence deletion accepts only known, non-deleted registry entries and uses their remote document ID.
- Never return environment variables, raw authorization headers, or SDK error bodies to the browser.

## Import and Readiness Flow

```text
POST /api/import
  │
  ├── parse every line
  │     └── any invalid line → 400, zero writes
  ├── group contiguous lines into exactly 24 dated moments
  │     └── wrong count/date bounds → 422, zero writes
  ├── create import run in atomic state
  ├── submit documents, max 3 concurrent; persist returned remote IDs
  │     ├── transient error → 3 total attempts with 250/750 ms backoff
  │     └── final error → mark document failed
  └── return 202 + runId

browser polls GET /api/import/:runId
  │
  ├── every 500 ms while visible
  ├── server refreshes statuses by remote document ID
  ├── done/failed are terminal; all other observed statuses remain in progress
  ├── all done → run three discovery searches; enable review
  ├── any failed → show exact failures + Retry
  └── 120 s elapsed → IMPORT_TIMEOUT, retain resumable run
```

The browser stops polling when hidden and resumes on visibility change. Repeated import submission returns the existing active run instead of creating duplicate work.

### Supermemory-driven proposal discovery

After all 24 moments reach `done`, MYRA runs three `searchMode: "memories"` queries over the full relationship history:

1. “Promises and commitments Maya and Ari made to each other”
2. “Relationship milestones and changes between Maya and Ari”
3. “Conflicts, boundaries, repair attempts, and reconciliations”

Returned memory text becomes proposal copy. The query category supplies the proposal kind; `sourceCustomId` metadata supplies evidence and the immutable date. Results without valid provenance are discarded. The Day 0 conformance gate must prove the configured extraction model returns the Kyoto promise plus at least one milestone and repair candidate from the final fixture before UI implementation begins.

The fixture stores expected anchor concepts for conformance tests, not checked-in proposal answers. If the configured model cannot find the anchors, adjust the fixture or Supermemory `entityContext` during the pre-build gate; do not hard-code the missing proposal.

## Proposal and Promise State Machine

```text
Proposal: pending ──confirm──► confirmed ──► Event
              │
              ├──edit──► pending (display text only; evidence day/type fixed)
              └──reject► rejected

Promise lifecycle:
made ──► kept ──► fulfilled
  │        │
  ├──► deferred ──► kept/fulfilled
  └──► broken ──► repaired ──► kept/fulfilled
```

The reducer rejects impossible transitions. A correction is a new confirmed update; history is append-only except when verified evidence deletion invalidates an unsupported event.

### Evidence deletion contract

Deletion calls Supermemory with the stored `remoteDocumentId`. A `204` or verified `404` is success; other responses leave local state unchanged. After success, mark the registry entry with `deletedAt`, invalidate dependent events, and exclude its `sourceCustomId` from every future result even if asynchronously derived memories remain briefly searchable. A post-delete filtered search must stop returning the source before the UI says “deleted from Supermemory”; until then it says “deletion processing.”

## Time Machine Flow

```text
slider day D
  │ 150 ms debounce; cancel prior fetch
  ▼
GET /api/timeline?day=D&q=<phase-aware query>
  ├── validate D
  ├── derive confirmed phase/events where occurredDay <= D
  ├── search Supermemory with numeric occurredDay <= D
  ├── reject any returned item whose metadata exceeds D (defense in depth)
  ├── require known sourceCustomId metadata and exclude tombstones
  └── return deterministic phase, promises, evidence, and template copy

browser
  ├── ignore responses older than latest request sequence
  ├── render evidence-backed state
  └── search failure → render confirmed structured state + retry notice
```

No cache is needed for the seeded dataset. Every slider request proves live Supermemory retrieval. Cancellation and debounce prevent request storms.

### Demo “whoa” interaction

The selected promise displays a before/after comparison driven by two live filtered searches:

```text
Kyoto promise at 2024-05-20       Kyoto promise at 2027-03-12
“future flirtation”               “fulfilled shared commitment”
2 eligible source moments         7 eligible source moments
```

The user can drag between those dates and open the newly eligible evidence. Wrapped launches from the final state. This makes changing memory context visible instead of presenting six apparently fixed cards.

## Wrapped Derivation

Wrapped is a pure function of confirmed events and supported evidence at the final selected day. Six fixed cards render in order:

1. Chapters crossed
2. Promise that followed you
3. Promise kept
4. Hard-month repairs
5. What changed most
6. Carry forward

Each card returns `{ id, title, value, evidenceCustomIds[] }`. Card values are computed from user-confirmed Supermemory proposal text and evidence, not fixture answer strings. If required evidence is missing, the card is omitted; MYRA never replaces it with invented prose. The conformance fixture must produce all six cards after confirmation.

## Recoverable Errors

| Failure | Server behavior | User experience |
|---------|-----------------|-----------------|
| Supermemory not running | `503 SUPERMEMORY_UNAVAILABLE` | Setup command and Retry button |
| Missing/invalid API key | Startup/health failure, key never echoed | “Check local Supermemory credentials” |
| Malformed transcript | `400 INVALID_TRANSCRIPT` with safe line number | Import remains editable; zero partial writes |
| Fixture/evidence mismatch | `422 FIXTURE_MISMATCH` | Name failed fixture assertion |
| Partial ingestion failure | Preserve run and successful docs | Progress view lists failed items and Retry |
| Indexing timeout | Preserve resumable run | Explain indexing is still incomplete |
| Search failure | Return deterministic confirmed state without search evidence | Timeline remains usable with visible retry notice |
| Stale proposal mutation | `409 STATE_VERSION_CONFLICT` | Refresh current proposal, preserve user input |
| Corrupt JSON state | Do not overwrite bad file | Recovery instructions and reset option |
| Delete failure or delayed forgetting | Keep local events until remote success; tombstone after success and verify search postcondition | Evidence stays or shows “deletion processing”; Retry |
| Rapid slider input | Cancel/ignore stale responses | Only latest date renders |

No error is silent. Every retryable error has a visible retry action; every non-retryable input error points to the field or source line.

## Performance Budgets

| Operation | Budget | Control |
|-----------|--------|---------|
| Server startup | <2 s excluding Supermemory | No build step; one small JSON read |
| Import submission | 3 concurrent requests across 24 moments | Prevent local server/model saturation |
| Transient add retry | 3 total attempts, 250/750 ms between attempts | Bounded retry with unambiguous semantics |
| Status polling | 500 ms visible, paused hidden | Clear progress without background churn |
| Whole import | 120 s before timeout state | Resumable, not cancelled or discarded |
| Timeline UI debounce | 150 ms | Avoid slider request storm |
| Timeline search | 8 results, threshold 0.25, no rerank | Enough evidence without extra latency |
| API timeout | 10 s search/delete; 15 s add/status batch | Abort and surface retryable error |
| Wrapped derivation | <10 ms | Pure iteration over small confirmed event list |

No application cache, worker queue, database, WebSocket, or background daemon is planned. Add them only after measured failure on a real dataset.

## Test Strategy

Use Node 22’s built-in `node:test`, `node:assert/strict`, global `fetch`, and `--experimental-test-coverage`. Do not add Jest, Vitest, Supertest, Playwright, fixtures libraries, or mocking packages.

`server.mjs` must export `createApp({ memoryAdapter, statePath })`; production startup is guarded by `if (import.meta.url === pathToFileURL(process.argv[1]).href)`. Tests start the app on an ephemeral port with a plain fake adapter.

Coverage target: every branch in the diagram has a named test. Node’s built-in coverage report is informational because the plan adds no threshold-enforcement dependency. CI fails on any test failure; the live conformance mode proves the real SDK/server contract that a fake cannot.

`test/myra.test.mjs` has two modes:

- default: deterministic unit/API tests with a fake adapter;
- `MYRA_LIVE=1 npm test -- --live`: real add → status → extracted-memory discovery → numeric-filter search → delete postcondition against `127.0.0.1:6767`.

### Coverage diagram

```text
CODE PATHS                                      USER FLOWS
[GAP] parseTranscript()                         [GAP →E2E] First import
  ├─ valid LF / CRLF                              ├─ select fixture
  ├─ malformed line / bad date                    ├─ progress queued→done
  ├─ wrong speaker / NUL / >1 MB                  ├─ partial fail→retry
  └─ zero writes on any error                      └─ review unlocked only when ready

[GAP] importFixture()                            [GAP →E2E] Proposal review
  ├─ stable custom IDs                             ├─ confirm
  ├─ concurrency ≤4                                ├─ edit
  ├─ transient retry / permanent fail              ├─ reject
  ├─ duplicate active run                          └─ stale mutation→refresh
  └─ queued/extracting/embedding/done

[GAP] reduceProposal()                           [GAP →E2E] Ongoing check-in
  ├─ confirm/edit/reject                           ├─ recognized→proposal
  ├─ invalid action / unknown ID                   ├─ unmatched→saved, no invention
  ├─ state-version conflict                        └─ Supermemory offline→retry
  └─ legal/illegal promise transition

[GAP] deriveTimeline(D)                          [GAP →E2E] Time Machine
  ├─ before first event                            ├─ scrub three named cutoffs
  ├─ exact inclusive boundary                      ├─ rapid scrub renders latest only
  ├─ phase + promise derivation                     ├─ evidence opens source
  ├─ future result rejected                        └─ search error keeps structure visible
  └─ zero eligible evidence

[GAP] deriveWrapped()                            [GAP →E2E] Wrapped finale
  ├─ all six fixture cards                         ├─ six cards in fixed order
  ├─ missing evidence omits card                   ├─ every card opens evidence
  └─ unsupported claim impossible                  └─ delete evidence removes claim

[GAP] atomicStateStore()                         [GAP] Recovery
  ├─ missing file initializes                      ├─ corrupt state blocks overwrite
  ├─ serialized overlapping writes                 ├─ failed delete preserves evidence
  ├─ temp write/rename failure                      └─ reset returns reproducible seed state
  └─ corrupt JSON/version preserved

COVERAGE BEFORE IMPLEMENTATION: 0 planned paths implemented
TARGET: every named domain/server branch tested + live substrate contract + 6 browser critical flows verified
```

### Required automated assertions

1. Parser accepts LF and CRLF fixtures and rejects every documented invalid boundary with zero adapter writes.
2. Stable custom IDs remain identical across repeated imports.
3. Add concurrency never exceeds four; transient failures retry exactly three times; permanent failure stays retryable through the route.
4. Import cannot become ready while any required document is nonterminal or failed.
5. Proposal confirm/edit/reject and version conflicts preserve deterministic state.
6. Promise reducer accepts every legal transition and rejects every illegal transition.
7. At `20240520`, phase is Talking and Kyoto is `made`.
8. At `20251018`, phase is Long Distance, Kyoto is `deferred`, calling has break+repair, and Attack on Titan is `kept`.
9. At `20270312`, phase is Living Together and Kyoto is `fulfilled`.
10. A mocked search result dated after the cutoff is rejected even if Supermemory returns it.
11. All six cards render from the full fixture; removing each required evidence source omits only its dependent card.
12. Atomic writes survive overlapping mutations; a write or rename failure leaves the previous file parseable.
13. Server never returns API keys or raw upstream error bodies.
14. Delete invalidates local events only after upstream deletion succeeds.
15. Reset deletes known custom IDs, tolerates missing remote documents, and returns the same derived fixture outputs after reseeding.

### Browser QA assertions

1. Import loading, failure, retry, ready, empty, and reconnect states are visually distinct.
2. Keyboard-only operation reaches import, proposal actions, slider, evidence controls, and Wrapped.
3. Focus is visible; status updates use an appropriate live region; buttons have accessible names.
4. At 375 px width no horizontal page overflow hides actions or evidence.
5. Rapid slider changes never flash an older date after a newer one.
6. The complete scripted route finishes in under three minutes.

## Failure Modes

| Codepath | Realistic failure | Automated test | Handling | User sees |
|----------|-------------------|----------------|----------|-----------|
| Startup | missing key/server | Yes | health failure | setup + retry |
| Import parse | malformed date | Yes | reject before writes | failing line |
| Add documents | model/server overload | Yes | bounded retry | failed items |
| Readiness | document never finishes | Yes | timeout, resumable run | still indexing |
| State mutation | duplicate click | Yes | version + serialized write | one confirmed result |
| Check-in | unmatched text | Yes | store raw, no proposal | explicit no-update message |
| Timeline | future memory returned | Yes | defense-in-depth filter | never exposed |
| Timeline | search timeout | Yes | structured fallback | retry notice |
| Wrapped | evidence deleted | Yes | recompute and omit | card disappears with explanation |
| State file | crash during write | Yes | temp + atomic rename | last valid state |
| Reset | remote item already absent | Yes | idempotent delete | successful reset |

Critical silent gaps after the fake suite, live conformance run, and browser QA: **0**.

## Five-Day Execution Plan

### Day 1 — Pre-build rehearsal, substrate proof, and fixtures

- Run native Windows `npx supermemory@4.24.12 local --port 6767` and record the installed server version plus observed response shapes.
- Gate: add one dated moment, persist its returned remote ID, wait for a terminal status, discover its extracted memory with provenance, perform numeric-filter search, delete by remote ID, and prove it no longer appears.
- If the gate fails due platform support, install WSL2 and repeat unchanged.
- Lock the extraction provider/model and run the entire 24-moment corpus. The Kyoto promise, one milestone, and one repair must be discoverable within the time budget.
- Write and validate the complete Maya/Ari transcript, expected anchor concepts, supported check-ins, and three cutoff snapshots.
- Create package skeleton only after the gate passes.

### Day 2 — Import, readiness, and confirmation

- Implement parser, stable IDs, Supermemory adapter, import routes, polling, atomic state, and proposal reducer.
- Finish automated tests for every Day 2 branch before UI polish.

### Day 3 — Time Machine

- Implement numeric-filter search, phase/promise derivation, evidence links, slider cancellation, and the three exact cutoff assertions.
- Run the complete first browser flow before adding Wrapped.

### Day 4 — Wrapped and deletion

- Implement six pure Wrapped templates, evidence viewer, check-in path, deletion invalidation, mobile layout, and accessibility states.
- Run automated tests plus the QA artifact route.

### Day 5 — Reproducibility and submission

- Verify reset/reseed and clean-machine README from a new terminal.
- Run tests with coverage and browser QA at desktop and 375 px.
- Rehearse and record the under-three-minute demo.
- Publish the public GitHub repository and submit the required links.

## What Already Exists

- Approved product design and rough wireframe; reuse their three-screen information hierarchy.
- Official `supermemory` JavaScript SDK; reuse it instead of hand-written HTTP calls.
- Supermemory `customId`; reuse it for idempotency and evidence identity, while retaining the remote document ID for status and deletion.
- Supermemory scalar metadata plus numeric filters; reuse them instead of a local memory index.
- Supermemory document status and delete endpoints; reuse them for readiness and evidence deletion.
- Node 22 built-in fetch and test runner; reuse them instead of more packages.

There is no application code to preserve. The wireframe is a visual source, not production markup that must remain unchanged.

## NOT in Scope

- React, Vite, TypeScript, component libraries, CSS frameworks, or frontend build tooling: no demo value within five days.
- Accounts, authentication, partner invitations, synchronization, billing, or multi-tenancy: one local user and fictional couple.
- Hosted Supermemory fallback: conflicts with the local hackathon premise.
- General WhatsApp parsing: only the documented seeded text grammar.
- App-owned LLM extraction or arbitrary check-in classification: Supermemory supplies memory candidates; users confirm lifecycle updates.
- A second chat-generation model: semantic retrieval plus deterministic phase/promise copy is sufficient.
- Relationship health scores, diagnosis, blame, therapy, surveillance, or autonomous state changes: violates product trust boundary.
- Multiple relationships, friendships, family relationships, configurable state graphs, or RelationshipOS platform work: post-hackathon.
- Application cache, database, job queue, WebSockets, workers, containers, installers, or cloud deployment: add only after measured need.
- Automated cross-browser UI framework: browser QA artifact covers the single supported demo browser.

No `TODOS.md` entries are added. Deferred product ideas are intentionally documented here rather than creating backlog pressure during the hackathon.

## Parallelization

Sequential implementation, no worktree parallelization opportunity. The eight-file design shares one server, one domain module, one fixture, and one static UI; parallel worktrees would create more merge coordination than speed.

```text
substrate gate → fixture → domain + adapter → API → UI → Wrapped → QA/video
```

The fictional fixture can be drafted while the Windows runtime gate runs, but both must finish before implementation starts.

## Implementation Tasks

Synthesized from this review. Checkbox each task as it ships.

- [ ] **T1 (P1, human: ~2h / Codex: ~20min)** — runtime — Prove native Windows Supermemory add/status/filter/delete; document WSL fallback only on failure.
  - Surfaced by: Architecture and outside voice — official platform support, model choice, and local response contracts are unproven on this machine.
  - Files: `README.md`
  - Verify: live add/status/discovery/filter/delete conformance gate against `127.0.0.1:6767`.
- [ ] **T2 (P1, human: ~3h / Codex: ~30min)** — fixture — Write the source transcript, check-ins, proposal evidence, and cutoff snapshots.
  - Surfaced by: Scope and Tests — every later assertion depends on one coherent source of truth.
  - Files: `fixtures/myra.json`, `test/myra.test.mjs`
  - Verify: fixture validation plus three exact snapshot assertions.
- [ ] **T3 (P1, human: ~4h / Codex: ~45min)** — ingestion — Implement parser, metadata contract, stable IDs, bounded concurrency, status polling, and retries.
  - Surfaced by: Architecture — queued documents are not immediately searchable.
  - Files: `server.mjs`, `domain.mjs`, `test/myra.test.mjs`
  - Verify: import branch tests and real local smoke test.
- [ ] **T4 (P1, human: ~3h / Codex: ~35min)** — state — Implement confirmation reducer and atomic serialized state writes.
  - Surfaced by: Code Quality — direct JSON writes risk corruption and lost updates.
  - Files: `server.mjs`, `domain.mjs`, `test/myra.test.mjs`
  - Verify: reducer transition matrix plus overlapping/failing-write tests.
- [ ] **T5 (P1, human: ~4h / Codex: ~45min)** — time-machine — Implement numeric-filter retrieval, cutoff derivation, evidence links, debounce, and stale-response cancellation.
  - Surfaced by: Architecture and Performance — future-memory leakage breaks the central claim.
  - Files: `server.mjs`, `domain.mjs`, `public/index.html`
  - Verify: three cutoff assertions and injected future-result rejection.
- [ ] **T6 (P1, human: ~4h / Codex: ~45min)** — wrapped — Implement check-in proposals, six pure cards, evidence deletion, and visible fallback states.
  - Surfaced by: Test Review — every emotional claim must remain evidence-backed.
  - Files: `domain.mjs`, `server.mjs`, `public/index.html`, `test/myra.test.mjs`
  - Verify: all cards plus one-evidence-at-a-time invalidation tests.
- [ ] **T7 (P2, human: ~4h / Codex: ~45min)** — UX — Apply wireframe hierarchy, mobile layout, keyboard access, live statuses, and complete error recovery.
  - Surfaced by: Browser QA — the three-minute route must remain legible and operable under failure.
  - Files: `public/index.html`
  - Verify: QA artifact at desktop and 375 px.
- [ ] **T8 (P1, human: ~3h / Codex: ~30min)** — release — Prove clean setup/reset/reseed, run coverage and browser QA, record demo, and publish public repository.
  - Surfaced by: Distribution — unreproducible local code cannot win the hackathon.
  - Files: `package.json`, `README.md`, `.github/workflows/ci.yml`
  - Verify: new-terminal setup, `npm test`, browser QA, public repo and video links.

## Outside Voice Resolution

The independent Codex plan challenge found the following gaps; all were accepted and folded into this plan:

- persist both stable `customId` and returned `remoteDocumentId`;
- copy `sourceCustomId` into scalar metadata and reject untraceable results;
- reduce ingestion from every line to exactly 24 dated moments;
- generate proposal copy from Supermemory-extracted/searchable memories rather than fixture answers;
- make model/provider selection and full-corpus extraction a pre-build rehearsal gate;
- pin SDK/CLI and record the observed server contract;
- ingest check-ins through the same add/status/search/delete lifecycle;
- prohibit proposal edits from changing evidence date or type;
- tombstone verified deletions and filter delayed derived results;
- serialize the entire mutation transaction, not only the filesystem write;
- define three total attempts, not ambiguous “three retries”;
- replace a fake-only confidence claim with a committed live conformance mode;
- load `.env` explicitly with Node’s `--env-file`;
- treat built-in coverage as informational rather than claiming an unenforced threshold;
- make the visible “whoa” moment a live before/after promise comparison driven by two filtered searches.

The review’s concern about excessive production hardening was partly accepted: no database-grade durability, cache, queue, browser automation dependency, or generalized extraction is planned. Atomic replacement, CI, and complete domain/API branch tests remain because they are small and directly protect the demo.

## Review Sources

- Supermemory self-hosting and local base URL: https://supermemory.ai/docs/self-hosting/overview
- Supermemory local quickstart and state paths: https://supermemory.ai/docs/self-hosting/quickstart
- Supermemory ingestion, `customId`, metadata, and `dreaming`: https://supermemory.ai/docs/add-memories
- Supermemory hybrid search and numeric metadata filters: https://supermemory.ai/docs/search
- Supermemory document deletion: https://api.supermemory.ai/v3/openapi

## Review Completion Summary

- Step 0: Scope Challenge — scope reduced per recommendation to one Node app and eight authored files.
- Architecture Review: 4 issues found; all resolved.
- Code Quality Review: 3 issues found; atomic transaction queue, validation boundaries, and recoverable error contract locked.
- Test Review: coverage diagram produced; 21 planned gaps converted into automated/live/browser checks.
- Performance Review: 3 issues found; bounded corpus, concurrency, polling, timeouts, search limits, and cancellation locked.
- NOT in scope: written.
- What already exists: written.
- `TODOS.md` updates: 0; deferred ideas remain explicit exclusions rather than hackathon backlog.
- Failure modes: 0 critical silent gaps after the planned fake suite, live conformance run, and browser QA.
- Outside voice: Codex ran; all material findings were absorbed.
- Parallelization: sequential implementation; fixture drafting may overlap only with the pre-build runtime rehearsal.
- Lake Score: 31/31 findings received the complete, hackathon-appropriate resolution.
- QA artifact: `C:\Users\yashd\.gstack\projects\super-memory\yashd-master-eng-review-test-plan-20260710-232436.md`.
- Autoplan JSONL: not written because `jq` is not installed; the complete task list is preserved above in Markdown.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | Office Hours product design supplied scope |
| Codex Review | automatic outside voice | Independent plan challenge | 1 | ISSUES ABSORBED | Remote IDs, provenance, bounded corpus, real proposal discovery, live conformance, and visible wow moment folded in |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 31 issues/gaps resolved, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | Approved rough wireframe exists; formal design review not run |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | Windows-first setup and recovery are specified in this plan |

**CODEX:** Independent challenge found material ID/provenance, runtime, authenticity, and test-evidence gaps; all were accepted and incorporated.

**CROSS-MODEL:** Both reviews agree on one bounded local app, native Supermemory metadata filtering, server-only credentials, live substrate proof, and no generalized RelationshipOS work during the hackathon.

**VERDICT:** ENG CLEARED — implementation-ready after the mandatory pre-build Supermemory conformance gate.

NO UNRESOLVED DECISIONS
