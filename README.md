# Repple

Repple is a browser-extension workflow plus a public Next.js app for dealership appointment landing pages.

## Stack

- WXT extension
- Next.js public web app
- Supabase
- Vercel

## Public Product Surface

- Extension creates appointment rows in Supabase.
- Public links resolve at `/r/{shortId}` on `repple.ai`.
- Public preview images resolve at `/r/{shortId}/preview-image`.
- Open Graph images are generated dynamically per appointment.

## Local Commands

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm run build:web
npm run typecheck:web
```

## Environment

- Extension env: `.env` from `.env.example`
- Web env: `apps/web/.env.local` from `apps/web/.env.example`

## Deployment

Deploy `apps/web` to Vercel with the `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars set to production values. Point the extension `WXT_PUBLIC_APP_URL` env var at the deployed `https://repple.ai` origin.
