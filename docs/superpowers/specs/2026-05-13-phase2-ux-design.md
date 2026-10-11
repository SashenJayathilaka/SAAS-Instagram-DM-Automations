# AP3k — Phase 2 UX Design Spec

**Date:** 2026-05-13  
**Status:** Approved  
**Scope:** Frontend UX only — Phase 1 backend is stable and must not be changed unless the UI strictly requires it.

---

## 1. Design Direction

### Brand
- **Product name:** AP3k (not "Slide")
- **Logo mark:** AP3K (gradient: #3B82F6 → #6366F1, 28–30 px rounded square)
- **Voice:** Creator-focused. No enterprise language. Use: campaigns, keywords, DMs, leads, replies, automations.

### Design tokens
| Token | Value |
|-------|-------|
| Background | `#0B0F19` |
| Surface | `#111827` |
| Surface 2 | `#1a2235` |
| Border | `#1e2d45` |
| Blue accent | `#3B82F6` |
| Purple accent | `#6366F1` |
| Green | `#10B981` |
| Amber | `#F59E0B` |
| Text | `#F9FAFB` |
| Muted text | `#9CA3AF` |

### Visual style
- Dark premium — Linear / Stripe / Vercel feeling
- Large spacing, modern cards, subtle gradients/glows on key CTAs
- No giant tables, no node editors, no enterprise spaghetti
- Smooth but not distracting — micro-transitions at 150–200 ms ease

---

## 2. Navigation Structure

### Public routes
| Route | Description | Status |
|-------|-------------|--------|
| `/` | Landing page | Rebuild |
| `/pricing` | Dedicated pricing page | New |
| `/sign-in` | Clerk auth | Keep |
| `/sign-up` | Registration → onboarding redirect | Keep |

### Onboarding (new user flow)
| Route | Description | Status |
|-------|-------------|--------|
| `/onboarding` | Welcome + product explanation | New |
| `/onboarding/connect` | Connect Instagram step | New |
| `/onboarding/complete` | Success → redirect to wizard | New |

Trigger: in `app/(protected)/dashboard/[slug]/page.tsx` (server component), check if the user has no integrations. If so, `redirect('/onboarding')`. This keeps it out of middleware and avoids a full-page redirection loop.  
Secondary: dashboard checklist shows onboarding progress for users who skipped.

### Dashboard (authenticated)
| Route | Description | Status |
|-------|-------------|--------|
| `/dashboard/[slug]` | Home — stats, campaigns, quick-create | Update |
| `/dashboard/[slug]/automation` | Campaign list | Update |
| `/dashboard/[slug]/automation/new` | Guided 6-step wizard | New |
| `/dashboard/[slug]/automation/[id]` | Campaign detail + analytics + edit | Rebuild |
| `/dashboard/[slug]/integrations` | Instagram connection | Keep |
| `/dashboard/[slug]/settings` | Account + billing | Keep |

### The old node editor (`Trigger → Then → Post`) is no longer the primary UX.
The wizard at `/automation/new` replaces it for campaign creation. The `[id]` page becomes a read/edit/stats detail page.

---

## 3. Screens

### 3.1 Landing Page (`/`)

**Goal:** User understands the product in ≤ 15 seconds and clicks "Start free."

**Headline:** "Turn Instagram Comments Into Leads Automatically"  
**Subheadline:** "Ask your audience to comment a keyword. AP3k sends the right DM, link, guide, or offer instantly."

**Hero layout:** Two columns above the fold.
- Left: headline + subheadline + 2 CTAs ("Launch your first campaign →", "See how it works")
- Right: animated Comment → DM → Lead captured flow illustration showing a real Instagram post with a comment, the keyword match, the DM sent, and "Lead captured" confirmation

**Examples strip** (below hero, before features — 3 tiles side by side):
```
Comment "GUIDE"  →  Free PDF sent via DM
Comment "PRICE"  →  Offer link sent via DM
Comment "BOOK"   →  Booking page sent via DM
```

**Sections (in order, no more):**
1. Nav
2. Hero (above the fold)
3. Examples strip (3 tiles)
4. Trust bar (stats: DMs sent, leads captured, delivery rate, active creators, response time)
5. Features (6 cards, 3×2 grid)
6. Pricing (3 tiers — see §3.5)
7. Footer

**Do not add:** testimonials wall, FAQ, blog previews, cookie banners, popups.

---

### 3.2 Dashboard Home (`/dashboard/[slug]`)

**Goal:** "Launch or monitor campaigns fast."

**Layout:** Fixed sidebar (220 px) + main content area.

**Sidebar items:** Home, Campaigns (badge), Analytics, Leads | Integrations, Settings | Upgrade card (Free tier only)

**Topbar:** Greeting ("Good morning, [name] 👋"), activity subtitle, notification icon, avatar.

**Content sections (vertical stack):**
1. **4 stat cards** — DMs sent, Leads captured, Comments matched, Reply rate (with weekly deltas)
2. **Quick-create CTA banner** — "Launch a new campaign · 60 seconds" + "New Campaign" button
3. **Two-column grid:**
   - Left (wider): Active campaigns list (name, keyword pills, DM count, lead count, Live/Paused/Smart AI tag)
   - Right: Onboarding checklist (progress bar + 3 items) + Live activity feed (secondary)

**Empty state (no campaigns):**
> "No campaigns yet"  
> "Launch your first comment-to-DM funnel in 60 seconds. Pick a post, add keywords, write your DM."  
> [Launch first campaign →] button

Stats cards show `—` (not 0) when empty to avoid "0 leads" anxiety.

---

### 3.3 Automation Wizard (`/dashboard/[slug]/automations/new`)

**Goal:** Creator creates and activates a campaign in ≤ 60 seconds.

**Step order (6 steps):**

| # | Step | Required | Notes |
|---|------|----------|-------|
| 1 | Choose post | Yes | Grid of recent IG media, single select |
| 2 | Add keywords | Yes | Chip input, Contains mode default |
| 3 | Write DM | Yes | Main value step — templates + {{vars}} |
| 4 | Public reply | No | Optional, clearly marked "optional" |
| 5 | AI mode | No | Toggle, PRO badge, soft upsell |
| 6 | Review & Activate | Yes | Summary + big activate button |

**Step 1 — Choose post:**
- 4×2 grid of post thumbnails from `getProfilePosts`
- Show post type badge (Reel / Post), like count, comment count on hover
- Single-select with blue ring + checkmark overlay

**Step 2 — Add keywords:**
- Text input + "Add" button → chips with ×
- Matching mode selector (3 options): **Contains** (default), Exact, Smart AI (PRO)
- Hint: "Use words your audience actually types — 'link', 'info', 'guide'"
- Max recommended: 2–5 keywords

**Step 3 — Write DM (most important):**
- Textarea (min 90 px, resizable)
- Click-to-insert variable buttons: `{{first_name}}` `{{username}}` `{{keyword}}` `{{link}}`
- CTA link input (optional, feeds `{{link}}`)
- **Live preview bubble** showing resolved template with fake data
- **5 quick-start templates** (click to load into textarea):
  - Free guide: "Hey {{first_name}}! Here's the free [guide] you asked for → {{link}} 🎁"
  - Price inquiry: "Hey {{first_name}}! Here are the full pricing details → {{link}} 💰"
  - Booking call: "Hey {{first_name}}! Grab your spot here → {{link}} 📅"
  - Discount code: "Hey {{first_name}}! Your exclusive discount code is inside → {{link}} 🔥"
  - Course link: "Hey {{first_name}}! Here's the course link you asked for → {{link}} 🎓"

**Step 4 — Public reply (optional):**
- Small textarea, labelled "Optional — leave blank to skip"
- Helper text: "This appears publicly under the comment before the DM is sent."
- Variables work here too
- Skip button prominent

**Step 5 — AI mode (optional):**
- Large toggle card with purple gradient icon
- PRO badge — shows upgrade prompt for Free tier
- Description: "Let AI handle follow-up questions in the DM thread. 24/7, in your tone."
- When OFF: shows "Standard mode — fixed DM message" 

**Step 6 — Review & Activate:**
- Summary table: post name, keywords, public reply (yes/no), DM preview (first 80 chars), AI mode
- Each row has an "Edit" link that jumps back to that step
- Big gradient "🚀 Activate Campaign" button
- Sub-copy: "Your campaign goes live instantly. You can pause it any time."

**Wizard chrome:**
- Sticky header: "← Back to campaigns" | "New Campaign · Launch in 60 seconds" | "Auto-saved"
- Stepper with 6 steps — done = green ✓, active = blue filled, upcoming = grey outline
- Sticky footer: contextual tip on left, Back + Next/Activate on right
- Each step fades in (200 ms translateY 10px → 0)

---

### 3.4 Campaign Detail + Analytics (`/dashboard/[slug]/automations/[id]`)

**Goal:** "See how this campaign is performing and make quick edits."

**Layout:** 2-column — left: campaign info + edit controls; right: analytics

**Left column:**
- Campaign name (editable inline)
- Status toggle (Live / Paused) — big and prominent
- Keywords (chips, click to delete)
- DM message preview (read-only card with "Edit" button → opens edit modal or inline)
- Post thumbnail

**Right column (analytics from `getAutomationStats`):**
- 4 stat cards: DMs sent, Leads captured, Comments matched, Reply rate
- Last-sent timestamp
- Export leads button (future — placeholder for now)

**No chart required in MVP** — stat cards are enough. Chart can be added in Phase 3.

---

### 3.5 Pricing Page (`/pricing`)

**Tiers:**

| Tier | Price | Target | Highlight |
|------|-------|--------|-----------|
| Free | $0/mo | Getting started | — |
| Creator | $29/mo | Serious creators + coaches | "Most popular" badge |
| Agency | $79/mo | Teams + multiple accounts | — |

**Creator plan features** (recommended, positioned centre):
- Unlimited campaigns
- Unlimited DMs
- Smart AI replies
- Full analytics + leads export
- {{variable}} personalisation
- Priority support

**Layout:** 3-column card grid. Creator card has blue border glow + gradient top accent + "Most popular" badge.

**Below the grid:** short FAQ — 3 questions max:
- "Is it safe for my Instagram account?" 
- "Can I cancel any time?"
- "What's the DM limit on Free?"

---

### 3.6 Onboarding Flow (`/onboarding`)

**Trigger:** First sign-up with no Instagram connected.

**Step 1 — Welcome:**
- "Welcome to AP3k, [first_name] 👋"
- Single visual showing Comment → DM → Lead
- Sub-copy: "It takes 60 seconds to set up your first campaign."
- CTA: "Let's connect your Instagram →"

**Step 2 — Connect Instagram:**
- Large Instagram connection card (same as integrations page)
- Explain why: "We need access to your posts and messages to run automations."
- Privacy note: "We never post on your behalf."

**Step 3 — Complete:**
- "You're all set! Let's launch your first campaign."
- "Create my first campaign →" → redirects to `/automations/new`
- Skip option: "I'll explore first →" → redirects to dashboard

**Secondary recovery:** Dashboard shows onboarding checklist (progress bar) if any step is incomplete. Checklist disappears once all 3 steps done.

---

## 4. Component Library (new components to build)

| Component | File | Purpose |
|-----------|------|---------|
| `WizardStepper` | `components/global/wizard-stepper/` | 6-step progress bar |
| `CampaignCard` | `components/global/campaign-card/` | Campaign row in list + dashboard |
| `StatCard` | `components/global/stat-card/` | Metric with label + delta |
| `PostPicker` | `components/global/post-picker/` | IG media grid, single select |
| `KeywordInput` | `components/global/keyword-input/` | Chip input + matching mode |
| `DmEditor` | `components/global/dm-editor/` | Textarea + variables + templates + preview |
| `EmptyState` | `components/global/empty-state/` | Icon + title + CTA |
| `OnboardingChecklist` | `components/global/onboarding-checklist/` | Progress + checklist |
| `PricingCard` | `components/global/pricing-card/` | Tier card with features list |

All components use existing shadcn/ui primitives (Button, Input, Textarea, Card, Badge, Switch, etc.) and Tailwind.

---

## 5. Globals to update

### `app/globals.css`
Add CSS variables matching the design tokens. Switch the root theme to dark:
- `--background`: `11 15 25` (hsl equivalent of `#0B0F19`)
- `--card`: surface colour
- Keep existing shadcn variables but remap to the new palette

### `tailwind.config.ts`
Add custom colours: `rf-bg`, `rf-surface`, `rf-surface2`, `rf-border`, `rf-blue`, `rf-purple`, `rf-green`, `rf-amber`. These make component code readable.

### `app/layout.tsx`
- Add `dark` class to `<html>`
- Update metadata: title "AP3k", description, favicon (AP3K gradient square)

---

## 6. Implementation Order

Build in this sequence. Each screen gets its own commit. After each: `npx tsc --noEmit`, build check, commit.

1. **Globals** — CSS tokens, Tailwind colours, layout.tsx metadata, dark class
2. **Landing page** — `/app/(website)/page.tsx` + supporting components
3. **Dashboard home** — stats, campaigns, quick-create, checklist, empty state
4. **Automation wizard** — 6-step flow at `/automation/new`
5. **Campaign detail + analytics** — `/automation/[id]` rebuild
6. **Pricing page** — `/pricing`
7. **Onboarding flow** — `/onboarding`

---

## 7. Constraints

- Do not touch `app/api/webhooks/meta/` — Phase 1 webhook is stable
- Do not touch `actions/webhook/` — Phase 1 query layer is stable
- Do not add new Prisma models — Phase 1 schema covers everything needed
- `getAutomationStats` is the analytics data source — use it, don't replace it
- All new pages are server components with client islands where needed (React Query for mutation state, otherwise RSC)
- Clerk auth — all `/dashboard/**` routes already protected by middleware; no changes needed
