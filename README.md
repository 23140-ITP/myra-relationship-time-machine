# MYRA

**A local-first relationship time machine powered by Supermemory.**

MYRA reconstructs scattered moments into an inspectable relationship history. Review what the system discovers, travel through past relationship phases without leaking future knowledge backward, and generate an evidence-backed Relationship Wrapped.

The included demo follows the fictional couple Maya and Ari across 24 dated moments.

## What it does

- **Reconstruct:** import dated moments into one relationship history.
- **Review:** confirm, edit, or reject AI-discovered phases and promises.
- **Travel:** move between turning points and see only evidence known at that date.
- **Understand:** generate a Wrapped summary grounded in confirmed evidence.
- **Stay in control:** inspect and delete the evidence behind every conclusion.

## Quick start

### Requirements

- Node.js 22 or newer
- Supermemory Server 0.0.5 running at `http://127.0.0.1:6767`
- Optional Supermemory API key; localhost requests are auto-authorized by the verified local server
- An OpenRouter API key configured in Supermemory Local

### Windows PowerShell

```powershell
git clone https://github.com/23140-ITP/myra-relationship-time-machine.git
cd myra-relationship-time-machine
npm.cmd ci
Copy-Item .env.example .env
```

Open `.env` and replace the placeholder key:

```dotenv
SUPERMEMORY_API_URL=http://127.0.0.1:6767
SUPERMEMORY_API_KEY=
```

Configure Supermemory Local with your OpenRouter key and model. The verified demo used a free OpenRouter model; exact Supermemory environment variable names depend on the local server release.

Build and start MYRA:

```powershell
npm.cmd run build
npm.cmd start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

MYRA binds to localhost and rejects non-loopback Supermemory URLs. If you configure a Supermemory credential, the browser never receives it.

## Demo walkthrough

1. Select **Open App** and import the fictional story from **Overview**.
2. Open **Review** and confirm the discovered phases, promises, and repairs.
3. Open **Time Machine** and compare May 2024, October 2025, and March 2027.
4. Watch the Kyoto promise move from `made` to `deferred` to `fulfilled` without future evidence appearing in earlier chapters.
5. Add a check-in, review the resulting proposal, and open **Relationship Wrapped**.
6. Delete supporting evidence to demonstrate automatic claim invalidation.

The complete clean demo can be presented in about two minutes.

## Development

Run Express and Vite in separate terminals:

```powershell
# Terminal 1: API and production assets on port 3000
npm.cmd start

# Terminal 2: Vite development server on port 5173
npm.cmd run dev
```

Vite proxies `/api/*` requests to Express.

### Verify changes

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run coverage
```

The test suite covers parsing, stable IDs, ingestion concurrency and retries, version conflicts, timeline cutoffs, promise transitions, serialized state writes, credential redaction, evidence deletion, recovery, reset behavior, and Wrapped invalidation.

## Architecture

```text
Browser
  └─ React + React Router + Radix UI
       └─ same-origin /api/*
            └─ Express
                 ├─ MYRA deterministic state and timeline logic
                 └─ Supermemory Local :6767
```

- `/` is the public product website.
- `/app/overview` handles import and session status.
- `/app/review` handles discovery decisions.
- `/app/timeline` contains time travel, evidence, and check-ins.
- `/app/wrapped` presents the evidence-backed summary.
- `GET /api/session` restores the workspace after navigation or refresh.
- Runtime state is stored in `.data/myra-state.json`.

Supermemory owns ingestion, provider-backed extraction, embeddings, semantic search, numeric filtering, and deletion. MYRA owns reviewed state plus deterministic timeline and Wrapped derivation. There is no browser credential or separate database.

## API overview

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check Supermemory availability and import readiness |
| `GET` | `/api/session` | Restore the current workspace state |
| `POST` | `/api/import` | Start importing the included story |
| `GET` | `/api/import/:runId` | Read import progress |
| `POST` | `/api/import/:runId/retry` | Resume a failed import |
| `POST` | `/api/proposals/:id` | Confirm, edit, or reject a proposal |
| `POST` | `/api/checkins` | Add a new dated relationship check-in |
| `GET` | `/api/timeline?day=YYYYMMDD` | Retrieve cutoff-safe state and evidence |
| `GET` | `/api/wrapped` | Generate the current Wrapped cards |
| `DELETE` | `/api/evidence/:customId` | Delete evidence and invalidate dependent claims |
| `POST` | `/api/reset` | Delete imported documents and restore empty state |

## Troubleshooting

### `SUPERMEMORY_UNAVAILABLE`

Confirm that Supermemory is listening on port 6767:

```powershell
Invoke-WebRequest http://127.0.0.1:6767/health
```

If this project uses the configured WSL wrapper, start it with:

```powershell
wsl.exe -d Ubuntu -- bash -lc "cd /mnt/c/Users/yashd/Documents/Super-memory && exec /home/yashd/.local/bin/supermemory-server"
```

### Missing or invalid API key

Copy `.env.example` to `.env`. Add a key only if your local Supermemory server requires one, then restart MYRA. Never commit `.env`.

### Port 3000 is already in use

Stop the process currently using port 3000, then run `npm.cmd start` again.

### Reset the demo

Use the app reset action or call:

```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:3000/api/reset
```

## Privacy notes

- The bundled Maya and Ari corpus is fictional.
- MYRA and Supermemory storage remain local.
- Text used for extraction is sent to the OpenRouter model configured in Supermemory Local.
- Credentials and raw provider failures are not exposed to the browser.

## License

[MIT](LICENSE) © 2026 MYRA contributors.
