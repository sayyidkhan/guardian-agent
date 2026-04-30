# Guardian Agent

An AI-powered decision proxy and voice consultation platform. When your key person is unavailable, Guardian Agent steps in — making decisions, capturing context, and enabling real-time voice consultation as if they were present.

**Live App:** https://guardian-agent-snowy.vercel.app

---

## Features

- **AI Decision Engine** — Ask a question, get an `APPROVE`, `REJECT`, or `ESCALATE` response with confidence score and reasoning
- **Guardian Profile** — Configure your person's name, role, decision boundaries, and escalation rules
- **People Catalog** — Manage a list of contacts/personas to consult
- **Voice Consult Mode** — Start a live Vapi voice call with an AI persona mapped to your selected person; transcripts stream in automatically
- **Chat Consult Mode** — Text-based consultation with full conversation history
- **Service Health Dashboard** — Real-time health pills for OpenAI, Speechmatics, Redis, and Vapi
- **Persistent Decision Log** — Last 20 decisions stored in Redis (or in-memory for local dev)
- **Graceful Degradation** — Falls back to deterministic heuristics if OpenAI is unavailable; falls back to in-memory storage if Redis is unavailable

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 18 + TypeScript |
| API Server | Express (Node.js) |
| LLM | OpenAI (`gpt-4o-mini` by default) |
| Storage | Upstash Redis REST (in-memory fallback) |
| Voice Agent | Vapi Web SDK (`@vapi-ai/web`) |
| Speech-to-Text | Speechmatics REST API (proxied server-side) |

---

## Project Structure

```
guardian-agent/
├── api/
│   ├── ask-guardian.js          # POST /api/ask-guardian — decision engine
│   ├── health.js                # GET  /api/health — service status checks
│   ├── profile.js               # GET/POST /api/profile — guardian profile CRUD
│   ├── speechmatics-transcribe.js # POST /api/speechmatics/transcribe — STT proxy
│   ├── vapi-config.js           # GET  /api/vapi-config — public Vapi key delivery
│   └── _redis.js                # Shared Redis / in-memory storage helper
├── docs/
│   └── assistant-prompt/
│       └── donald.md            # Trump-style diplomatic negotiation system prompt
├── src/
│   ├── App.tsx                  # Main React application
│   └── styles.css               # Global styles
├── server.js                    # Express entry point
├── .env.example                 # Environment variable template
└── vercel.json                  # Vercel deployment config
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` — see [Environment Variables](#environment-variables) below.

### 3. Run in development

```bash
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000 |

Both run concurrently via `concurrently`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Optional | Powers the AI decision engine. Falls back to rule-based heuristics if missing. |
| `OPENAI_MODEL` | Optional | Model to use (default: `gpt-4o-mini`) |
| `UPSTASH_REDIS_REST_URL` | Optional | Upstash Redis endpoint. Falls back to in-memory storage if missing. |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash Redis auth token |
| `SPEECHMATICS_API_KEY` | Optional | Enables Speechmatics STT fallback for transcription |
| `SPEECHMATICS_LANGUAGE` | Optional | Language code (default: `en`) |
| `SPEECHMATICS_API_BASE_URL` | Optional | Speechmatics base URL (default: `https://asr.api.speechmatics.com/v2`) |
| `VITE_VAPI_PUBLIC_KEY` | Optional | Vapi public key — safe to expose in browser. Get from [dashboard.vapi.ai](https://dashboard.vapi.ai) → Account → API Keys. **Must match the org of your Vapi assistant.** |
| `VAPI_API_KEY` | Optional | Vapi secret key — server-side only, used for health checks |
| `PORT` | Optional | API server port (default: `3000`) |

> **Note:** The app works with zero env vars — Redis falls back to memory, LLM falls back to heuristics. For voice features, `VITE_VAPI_PUBLIC_KEY` is required.

---

## User Flow

```
Landing Page
    └── Setup Guardian Profile (name, role, decision rules)
            └── Ask Guardian
                    ├── Chat Mode — type your question → get APPROVE / REJECT / ESCALATE
                    └── Voice Mode — live Vapi call with AI persona
                            └── Transcripts stream into question field automatically
                                    └── "Ask with Transcript" → submit to decision engine
```

---

## API Reference

### `GET /api/health`
Returns real-time status for all backend services.

```json
{
  "overall": "healthy",
  "services": [
    { "name": "openai",       "status": "healthy", "details": "API reachable" },
    { "name": "speechmatics", "status": "healthy", "details": "API reachable" },
    { "name": "redis",        "status": "healthy", "details": "Connected" },
    { "name": "vapi",         "status": "healthy", "details": "API reachable" }
  ]
}
```

### `GET /api/profile` · `POST /api/profile`
Read or write the guardian profile.

```json
{
  "name": "Robin",
  "role": "Healthcare Coordinator",
  "canDecide": "Scheduling, referrals, budget under $500",
  "mustEscalate": "Anything requiring a physician sign-off",
  "exampleRules": "..."
}
```

### `POST /api/ask-guardian`
Submit a question and receive a decision.

**Request:**
```json
{ "question": "Can we approve the $200 equipment purchase?" }
```

**Response:**
```json
{
  "id": 1714000000000,
  "decision": "APPROVE",
  "action": "approve",
  "confidence": 87,
  "reasoning": "Amount is within the pre-approved budget threshold.",
  "createdAt": "2026-04-29T12:00:00.000Z"
}
```

### `POST /api/speechmatics/transcribe`
Server-side proxy for Speechmatics STT. Accepts base64-encoded audio and returns a transcript.

---

## Voice Consult Mode

1. Open **Ask Guardian → Voice** tab
2. Select a voice persona (mapped to the person you selected in People Catalog)
3. Click **Start Voice** — a Vapi call connects immediately
4. Speak naturally — transcripts stream into the question field in real time (final transcripts only, no duplicates)
5. Click **End Voice** when done
6. Click **Ask with Transcript** to submit the captured speech as a question

> Vapi uses Deepgram transcription internally. The `transcriptType: "final"` filter ensures only complete sentences are captured, keeping the transcript clean.

---

## Custom Assistant Prompts

Example prompts are stored in `docs/assistant-prompt/`. The included `donald.md` is a Trump-style diplomatic negotiation agent for Strait of Hormuz scenarios.

To use a custom assistant:
1. Create your assistant at [dashboard.vapi.ai](https://dashboard.vapi.ai)
2. Set your system prompt to match the style in `docs/assistant-prompt/`
3. Enter the assistant ID in the **Vapi Assistant ID Override** field in the UI

---

## Deployment

The app deploys to Vercel. `vercel.json` routes all `/api/*` requests to the Express server.

```bash
vercel deploy
```

Set all environment variables in the Vercel project dashboard under **Settings → Environment Variables**.

---

## Design Decisions

- **Single-user by design** — guardian profile lives at a single Redis key (`guardian:profile`). Extend to multi-tenant by keying on user ID.
- **API key never exposed** — Speechmatics and OpenAI keys are backend-only. Vapi uses a public key (safe for browser), separate from the secret API key.
- **Decision log capped at 20** — lightweight; swap the slice limit or use a Redis list for full history.
- **No auth layer** — intentionally lean MVP. Add middleware to `server.js` to gate routes behind JWT or session.
