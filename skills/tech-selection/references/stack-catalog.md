# Stack catalog

Reference combinations known to work well for common web-app shapes.
This is NOT authoritative — search-first results and the specific
PRD override these. Use as a starting point when the requirements
are ambiguous.

Each entry lists:
- When to consider it
- Typical library composition
- Deploy targets that work
- Known caveats

---

## SaaS dashboard — Next.js + Postgres + Vercel

**Consider when:**
- Primarily authenticated, data-heavy CRUD.
- SEO for marketing pages matters, app pages are private.
- Small/mid team, no strong preferences.

**Composition:**
- Next.js (App Router) — full-stack framework, SSR + SSG.
- Prisma or Drizzle — ORM.
- next-auth / Auth.js or Clerk — authentication.
- Tailwind or CSS modules — styling.
- Stripe — payments (if needed).
- Resend or Postmark — transactional email.

**Deploy targets:**
- Vercel (first choice for Next.js).
- Railway / Fly.io (when serverless limits bite).
- Cloudflare Pages with OpenNext (cost-sensitive).

**Caveats:**
- Vercel pricing scales with compute; monitor usage.
- App Router churn has slowed but older examples may use Pages Router.

---

## Content-heavy marketing / blog — Astro + MDX + Cloudflare Pages

**Consider when:**
- Mostly static content, sprinkled interactivity.
- SEO is a top-3 priority.
- Author-friendly content workflow (MDX, CMS integration).

**Composition:**
- Astro — islands architecture, zero-JS by default.
- MDX or a headless CMS (Sanity, Payload, Contentlayer).
- Tailwind — styling.
- Minimal or no backend.

**Deploy targets:**
- Cloudflare Pages (cheap, fast, globally cached).
- Netlify.
- GitHub Pages (if content-only).

**Caveats:**
- If the product grows an app portion, consider splitting or
  migrating to Next.js.

---

## Server-rendered web app — Remix + SQLite/LiteFS + Fly.io

**Consider when:**
- Web-standards-aligned team (forms, progressive enhancement).
- Mostly authenticated flows with data mutations.
- Value of co-locating loader/action with route.

**Composition:**
- Remix — web-standards framework.
- SQLite via LiteFS for replication, or Postgres.
- Drizzle or Prisma.
- Tailwind.

**Deploy targets:**
- Fly.io (canonical Remix host, great for LiteFS).
- Cloudflare Workers (with adapter).

**Caveats:**
- Smaller template ecosystem than Next.js.
- Remix v2 feature parity with Next.js varies — check specifics.

---

## Minimal / cost-sensitive — Hono + htmx + any host

**Consider when:**
- Internal tool or low-traffic product.
- Small team wants to avoid client-side JS complexity.
- Minimal frontend interactivity.

**Composition:**
- Hono — tiny TS web framework.
- htmx — attribute-driven interactivity.
- Drizzle + SQLite.
- Tailwind with minimal classes.

**Deploy targets:**
- Anywhere (Fly.io, Cloudflare Workers, even a VPS).

**Caveats:**
- Template ecosystem is small — more hand-rolling.
- Complex client-side state will hurt; choose a heavier stack if the
  product grows.

---

## Real-time collab — Next.js + Postgres + Liveblocks / PartyKit

**Consider when:**
- Product has live cursors, shared state, or collaborative editing.
- User count per room is small-to-moderate (<= 100).

**Composition:**
- Next.js + Prisma + Postgres for persistent state.
- Liveblocks OR PartyKit OR y-websocket for realtime layer.
- Yjs for CRDT if rich collab.

**Deploy targets:**
- Vercel + Cloudflare (for PartyKit).
- Vercel + Liveblocks SaaS (managed).

**Caveats:**
- Realtime costs scale fast; check pricing.
- CRDT integration is nontrivial; scope carefully.

---

## Mobile-first PWA — Vite + React + IndexedDB + Vercel

**Consider when:**
- Primary use case is mobile web.
- Offline support matters.
- Mostly client-rendered.

**Composition:**
- Vite + React.
- Dexie on IndexedDB for client storage.
- Workbox for service worker.
- Supabase or a tiny Hono backend.

**Deploy targets:**
- Vercel, Netlify, Cloudflare Pages.

**Caveats:**
- SEO is weak — if marketing pages matter, build them separately
  with Astro / Next.js.
- Service worker caching is a source of bugs; test thoroughly.

---

## Data-heavy admin / internal tool — Retool / Appsmith / Tooljet

**Consider when:**
- Internal tool, small user base.
- Team lacks frontend skill.
- Willing to pay for a platform.

**Composition:** (platform-provided)

**Deploy targets:** (SaaS or self-hosted)

**Caveats:**
- Vendor lock-in.
- Customization ceilings.
- Cost per seat / per query.

---

## How tech-selection uses this catalog

1. Match the PRD shape against the section headers above.
2. Use the listed stack as *one of* 2-3 candidates.
3. Adjust based on search-first findings (library compatibility).
4. Adjust based on user technical level and preferences from
   discovery-notes §6.

**Never pick a stack purely because it's in this catalog.** The PRD
and the user's expertise win.
