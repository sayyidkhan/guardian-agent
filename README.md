# Guardian Agent

Lean MVP for an AI decision proxy.

## Stack

- Frontend: Vite + React + TypeScript
- API: Express (`/api/profile`, `/api/ask-guardian`, `/api/health`)
- Storage: Redis via Upstash REST (`@upstash/redis`)
- LLM: OpenAI (optional, fallback heuristic included)
- Voice STT: Speechmatics (backend API key)
- Voice Agent: Vapi Web SDK (`@vapi-ai/web`)

## Live App

- Production: `https://guardian-agent-snowy.vercel.app`

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Fill optional values in `.env`:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `OPENAI_API_KEY`
- `SPEECHMATICS_API_KEY`
- `VITE_VAPI_PUBLIC_KEY`
- `VAPI_API_KEY`

If Redis env vars are missing, app uses in-memory storage (good for quick local demo).
If OpenAI key is missing, app uses deterministic fallback decision logic.
If Speechmatics key is missing, voice transcription is unavailable.
Vapi assistant can be selected dynamically in the UI using the assistant override field.

4. Run app:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

## MVP Flow

1. Landing page
2. Setup Guardian profile
3. Ask Guardian for decisions (`APPROVE`, `REJECT`, `ESCALATE`)
4. Optional: click `Use Speechmatics Voice` to record and transcribe your question
5. Optional: open `Talk Directly` for online users and start a Vapi voice call

## Notes

- This is intentionally lean and single-user (`guardian:profile` key).
- Decision logs are saved in Redis key `guardian:decisions`.
- Speechmatics transcription is proxied via `/api/speechmatics/transcribe` so API key stays server-side.
- Service health pills in the header come from `/api/health` (OpenAI, Speechmatics, Redis).
