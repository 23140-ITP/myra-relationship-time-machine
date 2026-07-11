# MYRA

MYRA (Mapping Your Relationship's Adventures) is a localhost-only relationship time machine for the fictional couple Maya and Ari. It imports exactly 24 dated moments into Supermemory Local, retrieves only evidence available by a selected date, and ends with an evidence-backed Relationship Wrapped.

## Run on Windows

Requirements: Node.js 22+, Supermemory Server 0.0.5 running at `127.0.0.1:6767`, and its generated local API key.

```powershell
npm.cmd ci
Copy-Item .env.example .env
# Put the active local key in .env; never commit this file.
npm.cmd start
```

Open `http://127.0.0.1:3000`. MYRA binds only to localhost. The browser never receives the Supermemory credential.

If Supermemory is stopped, launch the configured WSL server (not its underlying binary):

```powershell
wsl.exe -d Ubuntu -- bash -lc "cd /mnt/c/Users/yashd/Documents/Super-memory && exec /home/yashd/.local/bin/supermemory-server"
```

Provider extraction currently uses OpenRouter, so fixture text may leave the machine. Embeddings, graph storage, and search remain local.

The verified local runtime is Supermemory Server `0.0.5` with `google/gemma-4-26b-a4b-it:free`. Local API responses can differ from hosted documentation; MYRA uses the contract verified against this server.

## Three-minute demo

1. Import the 24 fictional moments and wait for all documents to become ready.
2. Review and individually confirm the Supermemory-backed phase, promise, repair, and change proposals.
3. Scrub May 2024 → October 2025 → March 2027 to see Kyoto move from `made` to `deferred` to `fulfilled` without future evidence leaking backward.
4. Add the supported cancelled-call check-in and confirm its proposed lifecycle update.
5. Open the six Wrapped cards, then delete the Kyoto fulfillment evidence to demonstrate claim invalidation.

The complete clean import and demo route was rehearsed in 99 seconds. Browser QA artifacts are generated under the ignored `.data/qa/` directory.

## Verify

```powershell
npm.cmd test
npm.cmd run coverage
```

Runtime confirmation state is stored in `.data/myra-state.json`. `POST /api/reset` deletes registered Supermemory documents and restores empty local state. The included corpus is fictional and the scripted route is: import, scrub the three named dates, compare Kyoto's lifecycle, then view Wrapped.

The test suite covers parser boundaries, stable IDs, maximum-three ingestion concurrency, exact retry attempts, state-version conflicts, promise transition legality, cutoff filtering, overlapping serialized writes, upstream redaction, deletion postconditions, corrupt-state recovery, reset idempotency, and evidence-dependent Wrapped invalidation.

## Architecture

One Node/Express process serves static HTML and same-origin `/api/*` routes. Supermemory owns ingestion, extraction, embeddings, semantic search, numeric filtering, and deletion. MYRA owns only confirmed state and deterministic timeline/Wrapped derivation. There is no second model, browser credential, database, or cloud fallback.
