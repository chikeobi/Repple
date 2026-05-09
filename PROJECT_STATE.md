# Repple Project State

## Current Architecture

- Browser extension built with WXT.
- Primary interface is a Chrome side panel, opened per-tab from the extension action.
- Extension flow:
  - salesperson opens CRM/customer tab
  - Repple side panel auto-detects likely customer/vehicle/appointment fields
  - salesperson edits if needed
  - `Generate Repple` creates an appointment record, saves it, and produces SMS copy + public link
- Public customer experience is a separate Next.js app under `apps/web`.
- Public links use `/r/[shortId]` routes and read the same appointment data from Supabase.
- Mock video generation is client-derived, not stored in Supabase.
- Persistence split:
  - Supabase stores only the frozen appointment row
  - extension local storage is fallback in development

## Stack

- Extension:
  - WXT
  - React
  - TypeScript
  - Tailwind
- Public web app:
  - Next.js App Router
  - React
  - TypeScript
- Data:
  - Supabase JS client
- No auth, billing, CRM integrations, analytics, or backend API layer yet.

## Database Schema

Table: `public.repple_appointments`

Columns:
- `id bigint generated always as identity primary key`
- `generated_id text`
- `customer_name text`
- `vehicle text`
- `appointment_time text`
- `salesperson_name text`
- `dealership_name text`
- `address text`
- `created_at timestamptz default now()`

Security:
- RLS enabled
- public `select` + `insert` policies support the extension and public landing pages
- `generated_id` now requires a 5-7 character uppercase alphanumeric format
- unique index on `generated_id` is required for collision-safe public links

Important:
- Schema is intentionally frozen.
- App code should not assume additional Supabase columns unless explicitly requested.

## Completed Features

- Side-panel-first extension architecture.
- Tab-scoped side panel open behavior instead of global window-level persistence.
- Lightweight CRM page autofill heuristics for:
  - customer first name
  - vehicle
  - appointment time
- Appointment generation flow with:
  - short public ID
  - public landing page URL
  - SMS copy
- Supabase persistence for base appointment records.
- Local fallback persistence in development.
- Public Next.js landing page at `/r/[shortId]`.
- Dynamic Open Graph image route for rich link previews.
- Dedicated `/r/[shortId]/preview-image` endpoint for SMS and social previews.
- Mock video generation UX:
  - processing state
  - animated progress
  - simulated delay
  - ready state
- Compact locked mobile appointment card layout.
- MMS-ready helper shape for future SMS provider integration:
  - message body
  - media URL
  - short URL

## Current UI Direction

- Clean Apple/Linear/iOS-influenced minimalism.
- Light palette:
  - background `#f5f8fc`
  - card `#ffffff`
  - text `#0f172a`
  - muted `#64748b`
  - accent blue `#1473ff`
  - border `#e5eaf1`
- Public landing page is intentionally locked to a compact iPhone-width single-card experience:
  - max width `430px`
  - fixed section order
  - dense spacing
  - no dashboard/editorial layout behavior
- Vehicle is the primary visual focus in preview/video surfaces.

## Known Issues

- Public writes still rely on anonymous Supabase insert access, so abuse controls and auth are still future work.
- Public web app and extension share concepts but not a formal shared package yet.
- Mock video generation is deterministic client-side simulation only; no real video provider integration.
- Side panel still contains more product logic than ideal; some domain logic could later be shared cleanly with the web app.
- No true URL shortener service yet beyond short IDs on the public route.
- No delivery service integration yet for Twilio/SMS sending.
- Vercel deployment still needs production env wiring and Supabase schema application.

## Next Priorities

- Apply the updated Supabase schema in production.
- Deploy the Next.js public app to the production domain.
- Point extension SMS links to the real deployed `repple.ai` origin in env.
- Add a real SMS delivery layer using the existing `body + mediaUrl + shortUrl` shape.
- Replace mock video generation with a provider abstraction for HeyGen or similar.
- Tighten Supabase security model for public page reads and controlled writes.
- Reduce duplicated appointment/public-link logic between extension and web app.
- Add real vehicle/salesperson/dealership thumbnail assets instead of fully mocked visuals.
