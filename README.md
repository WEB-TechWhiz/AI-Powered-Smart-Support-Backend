# AI-Powered Smart Support Backend

Node.js + Express backend for AI-assisted customer support, built around JWT auth, MongoDB persistence, Redis-aware rate limiting, and OpenAI-powered support triage.

## Run Locally

```bash
npm install
copy .env.example .env
npm run start
```

## Main API Groups

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/chat/message`
- `GET /api/chat/history`
- `DELETE /api/chat/history`
- `POST /api/support/tickets`
- `GET /api/support/tickets`
- `GET /api/kb/search`
- `GET /api/admin/metrics`

## Notes

- Redis rate limiting is opt-in via `ENABLE_REDIS_RATE_LIMIT=true`.
- The AI layer uses the OpenAI Responses API with structured JSON output.
- MongoDB is required for persistence.
