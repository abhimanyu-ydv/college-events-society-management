Centralised College Events & Society Management System — a final-year project built with Next.js, TypeScript, Tailwind CSS, Supabase (Auth + Postgres) and Drizzle ORM.

## Phase 1: foundation

- Google sign-in via Supabase Auth, restricted to a configurable university email domain
- Three roles: Student (default), Society Head/Coordinator (per-society), University Admin (global)
- Role-based dashboard with route protection
- Society CRUD: students apply to start a society → admin approves/rejects → creator becomes head; students request to join active societies → head approves/rejects/removes members; heads can assign the `event_manager`/`faculty_coordinator` roles to approved members

## Phase 2: events, approval, venue scheduling, registration & tickets

- Admin-managed venues (`/dashboard/admin/venues`)
- Event creation by a society head/event manager, with an optional poster upload to Supabase Storage (bucket `posters`)
- Two-level approval: a faculty coordinator reviews first, then the university admin — admin approval is blocked and shows a warning when the event's venue/time overlaps another already-approved event
- University-wide upcoming-events list with a per-society filter (`/dashboard/events`)
- Single-click registration with a waitlist once `registrationLimit` is reached; cancelling promotes the next waitlisted student automatically
- A generated QR-code ticket for registered students (`/dashboard/events/[id]/ticket`)

## Phase 3: attendance & certificates

- Attendance panel (`/dashboard/events/[id]/attendance`) for the event's head/event manager/faculty coordinator: mark students present by typing/pasting their ticket code (works with any keyboard-wedge QR scanner) or toggling them in the roster list
- "Finalize attendance" locks further edits and generates a certificate PDF (`pdf-lib`) for every attendee, uploaded to Supabase Storage (bucket `certificates`)

## Phase 4: notifications

- Registering for an event sends a confirmation email (Resend) — with an `.ics` calendar file attached if you got a seat, a waitlist notice otherwise
- A reminder email is sent 24 hours before the event starts, scheduled via Inngest (`src/inngest/functions.ts`) when you register; it re-checks you're still registered (not cancelled) right before sending
- "Add to calendar" link on the event page and ticket page downloads the same `.ics` file on demand (`/dashboard/events/[id]/calendar.ics`) — this is a downloadable calendar file openable by Google Calendar/Outlook/Apple Calendar, not a live Google Calendar API push (that needs extra OAuth scopes, refresh-token storage, and Google's sensitive-scope app verification — not worth it for what the `.ics` file already achieves)
- Finalizing attendance now also emails each attendee their certificate PDF, not just storing it

## Phase 5: feedback & admin reports

- Students can rate (1–5) and comment on an event once it's ended, if they were registered (`/dashboard/events/[id]`) — resubmitting updates their existing feedback
- Admin reports (`/dashboard/admin/reports`): society activity (approved events, registrations, average rating), participation by department & year, venue utilisation — each exportable as CSV
- Society heads can export their approved member roster as CSV from the manage page

Exports are CSV rather than Excel/PDF — CSV opens natively in Excel and needs no new dependency; a real `.xlsx`/PDF report generator wasn't worth the extra surface for this.

## Phase 6 (current): AI-assisted event descriptions

- "Draft description with AI" on the new-event form (`/dashboard/societies/[slug]/manage/events/new`) sends the title, venue, date, and optional "key highlights" to Groq (Llama model) and fills in the description field, plus suggests a short announcement
- Optional by design, matching the synopsis: with no `GROQ_API_KEY` set, or if the Groq API call fails, the button just shows an error and the head types the description manually — nothing else in the app depends on it

This completes every module in the project synopsis.

## All phases at a glance
1. Foundation — auth, roles, societies
2. Events, approval, venue scheduling, registration & tickets
3. Attendance & certificates
4. Notifications (email, calendar, certificate delivery)
5. Feedback & admin reports
6. AI-assisted event descriptions (optional)

## Setup

1. Install dependencies: `npm install`
2. Create a [Supabase](https://supabase.com) project.
3. In Supabase, enable the **Google** auth provider (Authentication → Providers) and configure a Google OAuth client (Google Cloud Console) with redirect URL `https://<your-project-ref>.supabase.co/auth/v1/callback`.
4. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API (keep secret, server-only)
   - `DATABASE_URL` — Project Settings → Database → Connection string (use the **Transaction** pooler URI)
   - `ALLOWED_EMAIL_DOMAIN` — comma-separated university email domain(s), e.g. `university.edu`
   - `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — from [resend.com](https://resend.com) (needs a verified sending domain)
   - `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` — from [inngest.com](https://inngest.com); leave blank for local dev (see step 10)
   - `GROQ_API_KEY` — from [console.groq.com](https://console.groq.com); optional, leave blank to skip AI drafting
5. Apply the database schema: `npx drizzle-kit push` (or run the generated SQL in `drizzle/` via the Supabase SQL editor).
6. Create two public Storage buckets: `posters` (event poster uploads) and `certificates` (generated certificate PDFs) — Storage → New bucket, enable public access.
7. Run the dev server: `npm run dev`, then open [http://localhost:3000](http://localhost:3000).
8. Sign in once with your own university Google account, then promote yourself to admin by setting `is_admin = true` on your row in the `profiles` table (Supabase Table Editor or SQL editor) — there's no admin-promotion UI yet, this is a one-time manual step.
9. As admin, add at least one venue under `/dashboard/admin/venues` before any society can create an event.
10. To exercise the reminder email locally: set `INNGEST_DEV=1` in `.env.local` (without it, `/api/inngest` responds 500 — "In cloud mode but no signing key found" — since it assumes production by default), then run the Inngest dev server alongside `npm run dev`: `npx inngest-cli dev` (it discovers functions from `/api/inngest` automatically, no account needed for local testing).

## Development

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx drizzle-kit generate` — generate a SQL migration after changing `src/db/schema.ts`
- `npx drizzle-kit push` — apply schema changes directly to the database (dev convenience; use generated migrations for anything shared/production)

### This is not the Next.js you know

This project is on Next.js 16, which has breaking changes from earlier versions — notably **Cache Components** (`cacheComponents: true` in `next.config.ts`), which requires dynamic/per-request data access (`cookies()`, `searchParams`, DB reads tied to the request) to either sit behind a `<Suspense>` boundary or have `export const instant = false` on the route segment. See `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md` before changing auth or data-fetching code.
