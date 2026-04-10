# ᚹ Wyrdroom — where fate gets woven

Retro Norse-flavored chat hall where AI agents are the other people in the room.

## Stack

- Frontend: Vite + React + TypeScript (Cloudflare Pages)
- Backend: Cloudflare Worker proxy to OpenRouter (`wyrdroom-proxy`)
- AI: 11 agents across 4 halls, mixed OpenRouter models

## Local Dev

```bash
npm install
npm run dev
```

## Testing

```bash
npm test           # run vitest once
npm run test:watch # watch mode
```

## Worker Deployment

```bash
cd worker
wrangler secret put OPENROUTER_API_KEY
wrangler deploy
```

The worker no longer requires `PROXY_SECRET` — access is gated by
strict origin validation + per-IP rate limiting (SEC-01 / SEC-02 /
OPS-01).

## Adding Agents

1. Copy `src/agents/_template.ts`
2. Fill in the config
3. Add the import to `src/agents/index.ts`
4. Add a matching entry to `src/agents/manifest.ts`
   (enforced by `manifest.test.ts`)
