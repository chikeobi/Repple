# Repple Project State

`BUILD.md` is the source of truth for product scope and build order.

This file is intentionally lightweight so it does not drift into a second architecture spec.

## Current Reality

- Repple is in final pilot-production stabilization.
- The locked workflow is:
  CRM page -> open sidepanel -> autofill -> edit -> generate -> copy message -> customer opens card -> confirm/reschedule -> rep sees status.
- The live product uses:
  - WXT extension
  - React + TypeScript
  - Next.js web app
  - Supabase
  - Stripe

## Important Notes

- Repple does not send SMS.
- Repple does not replace dealership CRM texting.
- Fake video behavior has been removed until real video exists.
- `/mock-crm` remains the only mock page kept for extraction testing.

## Operational Blockers

- `npm run verify:e2e` still requires a configured confirmed QA account or service role key.
- Pilot readiness work is being tracked by the final sprint task list, not by this file.

For detailed status, use:
- [BUILD.md](/Users/chike/Repple/BUILD.md)
