# Admin command center

## Scope and design

Owner-only workspace at /admin with grouped navigation, a collapsible desktop sidebar,
keyboard section search (Cmd/Ctrl K), mobile navigation, readable dark surfaces, and
progressive disclosure. Navigation is inspired by
[satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) (MIT; Sat Naing).
This is an original Next.js implementation using AP3K's existing Radix/shadcn
components, not a transplant of the upstream Vite/TanStack app. No sample revenue,
customer records, or traffic is shown as real data.

Existing customer, billing, campaign, email, diagnostic, audit and AI-provider
actions remain in place. No changes to Instagram delivery, billing permissions,
customer entitlements or Clerk owner authorization are part of this upgrade.

## Workspaces

- Overview: current operational counters, attention queue, seven-day activity,
  thirty-day signup-cohort milestones, latest automation events and growth shortcuts.
- Analytics: seven/thirty-day aggregate operational records, current plan mix,
  optional GA4 channel reports and Search Console queries. UTC buckets include
  today's partial day. Plan counts are not revenue; API acceptance is not a read receipt.
- Content studio: all existing articles plus database drafts; edit structured sections,
  bullets, steps, safe links, existing cover assets, SEO metadata and publication state.
- SEO: editorial checklist, article noindex, stable canonical URLs and search-appearance editing,
  live sitemap/robots links, landing-page review and search-performance links.
  Global routing, robots rules and commercial-page copy stay code-managed.
- AI assistant: owner-requested operations briefing or draft review through the active
  provider already configured in AP3K. AI cannot publish, bill, message customers,
  change settings or execute actions.

## Editorial storage and release

The additive Prisma migration 20260923070000_editorial_posts creates EditorialPost.
The published snapshot is distinct from the draft. Existing source articles remain
the baseline until edited. Saving a draft preserves the live snapshot. Publishing
requires typing PUBLISH; unpublishing requires UNPUBLISH and retains the content.
Unpublished URLs return 404, while noindex articles remain readable and are omitted
from the sitemap. This is not a request to delete customer data.

Each write and its before/after audit record commit in one transaction. Optimistic
revision checks protect against lost updates. Recent audit snapshots can be loaded
back into the editor, then explicitly saved/published. Slugs lock after the first save.
The reserved slug new opens the creation editor. Future scheduling is deliberately
rejected rather than implying a background publisher exists.

CMS-edited articles are English-only. Old translated source articles retain their
translations until an owner publishes an English override. A locale-prefixed CMS
URL redirects to the canonical English article; a saved language preference alone
must not trigger a same-URL redirect.

Public content is cached for up to 60 seconds and invalidated after publication.
The homepage, blog, related articles and sitemap use the same published repository.
Public routes render on demand so a build does not require editorial queries.
Production builds run prisma migrate deploy before Next.js build using the existing
deployment script. Preview builds intentionally do not migrate the database.

Before release, test the migration on an isolated production-derived database branch.
Do not point preview publishing tests at production. No test article needs to be made
public in production. An application rollback can leave the additive table in place;
never drop it as part of rollback, since it may hold authored content.

## Google reporting

Tracking tags do not grant access to reporting APIs. An authorized administrator must:

1. Enable Google Analytics Data API and Search Console API for a dedicated service account.
2. Grant that account Viewer access to the GA4 property and read access to the verified
   AP3K Search Console property.
3. Save ADMIN_GOOGLE_SERVICE_ACCOUNT_JSON in encrypted, server-only deployment
   environment variables. Do not commit it, paste it into content, or expose it through NEXT_PUBLIC_.
4. Set ADMIN_GA4_PROPERTY_ID to the numeric property ID and ADMIN_GSC_SITE_URL to
   https://ap3k.com/ or sc-domain:ap3k.com.
5. Redeploy and check /admin/analytics. Missing credentials show setup-required;
   failed API calls show a sanitized configuration error, never invented numbers.

GA4 uses the previous 28 complete days in the property's timezone. Search Console
uses 28 days ending three days ago and displays the top 20 queries, not all search
traffic. Reports cache for up to 15 minutes. Google endpoints/scopes are fixed,
read-only and timeout-bounded. Raw credential/API error bodies are not returned.

## AI privacy and cost

Operations mode sends aggregate counts and daily totals, not customer email addresses,
access tokens or message bodies. Editorial mode sends the current owner-entered draft;
do not paste secrets into a draft. Provider processing/billing terms still apply.
Ten requests per owner per hour are reserved atomically with a transaction-scoped
advisory lock. Audit records contain task/status/output length, not the full prompt
or generated response. Treat suggestions as fallible; review claims before publication.

## Verification

Run npm test, npx tsc --noEmit, npm run lint and npm run build.
Focused tests cover existing-content compatibility, draft isolation, safe links,
stable canonical routing, noindex, explicit publication confirmations, revision
conflicts, recoverable unpublishing, owner-only AI/report access, request limits,
sanitized failures and report parsing. Live integration and browser verification
still require a working isolated database and an authorized preview session.

## Recovery verification (2026-09-23)

- Recovered the unfinished branch from the previous session without replacing it.
- 137 test files / 1,020 tests passed; production build, TypeScript and lint passed.
- Applied the exact additive migration to an isolated production-derived Neon branch.
- Database assertions passed for private drafts, preserving published snapshots, stale
  revision rejection, recoverable unpublishing and the AI transaction advisory lock.
- Fixed an optional revision-history prop in the local UI fixture. The fixture can be
  built with `node scripts/admin-ui-preview/build.mjs /absolute/scratch/output` and
  served locally; it uses sample data and inert actions and is never an app route.
- Local filesystem/localhost preview access is unavailable in the cloud browser;
  the authenticated deployed admin is the visual verification target.
