# V1 Launch Funnel — Project State

**Last updated:** 2026-05-01 (Friday — paused for the weekend)
**Owner:** Spencer Wright (SeasonProof Growth LLC)
**Purpose:** Single-page state doc so a fresh Claude session can pick up this project without losing context.

---

## ⏸ RESUME BRIEF — Read This First (paused 2026-05-01)

**Session goal we were mid-stream on:** Wire Meta tracking into the funnel so every qualified application fires a `Lead` event Meta can optimize against, with CAPI-ready dedupe baked in.

### What's now live (committed + pushed, commit `c21fd26`)

1. **Meta Pixel base code added** to root, `/v4/`, `/v5/`, `/v6/` LPs
   - PageView fires on page load
   - **Pixel ID is still `YOUR_PIXEL_ID` placeholder in 5 files** — must replace before launch
2. **`Lead` event now fires at survey-submit time** (not on `/qualified/` page-load like before)
   - Fires only when ICP gate passes
   - Includes a `crypto.randomUUID()` `eventID` per submission for future CAPI dedupe
   - `event_id` is also stashed in `formData` + sessionStorage, ready to be passed server-side
3. **Removed duplicate `Lead` fire from `/qualified/`** (was double-counting)
4. **Tightened ICP gate** across all four LPs to match the Justin Wylie avatar:
   ```js
   function isICP(d) {
     if (d.own_business !== 'yes') return false;
     if (d.revenue === 'under_500k' || d.revenue === '500k_1m') return false;
     return true;
   }
   ```
   - Translation: must own a deck biz **and** be $1M+. Timing no longer gates.
   - $1M+ "just researching" still routes to `/qualified/` (high-value capture, Spencer's call)

### Live URLs (current)

| Page | URL | Pixel? |
|---|---|---|
| **Landing page (root, V2 layout)** | https://apply.deckingleads.com/ | base + Lead at submit (ICP only) |
| Variant — V4 "The Audit" | https://apply.deckingleads.com/v4/ | base + Lead at submit (ICP only) |
| Variant — V5 "The Bluff" | https://apply.deckingleads.com/v5/ | base + Lead at submit (ICP only) |
| Variant — V6 "Terminator" | https://apply.deckingleads.com/v6/ | base + Lead at submit (ICP only) |
| Qualified booking | https://apply.deckingleads.com/qualified/ | PageView only (Lead fires upstream now) |
| Disqualified booking | https://apply.deckingleads.com/scheduling/ | none — by design |

### What's pending when we resume

1. **Replace `YOUR_PIXEL_ID` in 5 files** — simplest run:
   ```bash
   cd "/Volumes/T7/SPG/1. MARKETING/Website/Landing Pages/v1-launch-page"
   grep -rl YOUR_PIXEL_ID . | xargs sed -i '' 's/YOUR_PIXEL_ID/<real-id>/g'
   git add -A && git commit -m "Wire real Meta Pixel ID" && git push
   ```
2. **Verify in Meta Events Manager → Test Events tab** — submit form as ICP and non-ICP, confirm Lead fires only on ICP path with the eventID present
3. **(Optional next layer) Wire GHL CAPI for server-side dedupe** — POST submission to a GHL inbound webhook with `event_id`, `_fbc`, `_fbp`, then have a GHL workflow fire the Facebook CAPI action. Code skeleton (`submitToGHL()`) already discussed in the chat — not yet committed.
4. **Mailing address placeholder** still in `/terms/` (§19, §31) and `/privacy/` Contact section
5. **Decide: promote V6 "Terminator" to root** once Spencer confirms it's the winner (V2 is currently at root)

### How to jump back in fast

Open this doc → say to Claude:
> "Resume the V1 launch funnel. Read PROJECT-STATE.md. Current task is replacing the Meta Pixel ID and verifying Lead fires correctly in Events Manager."

Or pick a different thread from the pending list above.

---

> **Read first:** When resuming this project, also read in this order:
> 1. `/Users/spencerwright/.claude/projects/-Volumes-T7-SPG-1--MARKETING-Claude-Code-Folder/memory/MEMORY.md` (auto-memory — load Speed Over Perfection + 30-Day Pivot entries especially)
> 2. `/Volumes/T7/SPG/0. FOUNDATIONS/Coaching Calls/FOCUS-ANCHOR.md` (the León rules + April 27 tactical bottlenecks)
> 3. This document.
>
> The auto-memory and FOCUS-ANCHOR shape *how* you should work with Spencer. This doc covers *what* is built and *what's pending* on this specific project.

---

## TL;DR

A static three-version landing page for cold Meta-ads traffic, deployed via GitHub Pages on the custom domain `apply.deckingleads.com`. Three LP variants live side by side for A/B/C testing. Two terminal pages handle ICP vs non-ICP routing (only the ICP one carries the Meta Pixel). Two legal pages (`/terms/`, `/privacy/`) are draft-stage and need attorney review.

The funnel converts a Meta ad click → applicant qualifying form → routed booking page → GHL calendar → 45-min Google Meet with Spencer.

**Strategic context:** Per the Q2 Roadmap (signed 2026-04-26) and Tyler's April 27 reset, Spencer is in a 30-day "document the process" phase. This LP is the front-end machine that needs to produce qualified bookings. Spencer runs every appointment himself for 30 days as the proof loop. Hiring is paused. Don't propose hiring conversations until ~May 27.

---

## Live URLs

| URL | Page | Status |
|---|---|---|
| `https://apply.deckingleads.com/` | **V1** (baseline) | Live |
| `https://apply.deckingleads.com/v2/` | **V2** (CRO refinements: form moved up, 4-step survey, Brian Wallace pull-quote, full legal footer) | Live · `noindex` |
| `https://apply.deckingleads.com/v3/` | **V3** (V1 + Version B long-form story lead inserted between marquee and proof) | Live · `noindex` |
| `https://apply.deckingleads.com/qualified/` | ICP terminal page (Meta Pixel fires here) | Live · `noindex` |
| `https://apply.deckingleads.com/scheduling/` | Non-ICP terminal page (no pixel by design) | Live · `noindex` |
| `https://apply.deckingleads.com/terms/` | Terms of Service — full 100-in-100 guarantee conditions in Section 3 | Live · DRAFT · `noindex` |
| `https://apply.deckingleads.com/privacy/` | Privacy Policy | Live · DRAFT · `noindex` |

GitHub repo: **https://github.com/morejobcalls/deckingleads-apply** (public, owner `morejobcalls`)

---

## Local file structure

Working directory: `/Volumes/T7/SPG/1. MARKETING/Website/Landing Pages/v1-launch-page/`

```
v1-launch-page/
├── index.html              ← V1 (live at apply.deckingleads.com/)
├── v2/
│   └── index.html          ← V2 with CRO refinements + full legal footer
├── v3/
│   └── index.html          ← V3 with Version B long-form lead
├── qualified/
│   └── index.html          ← ICP booking page (Meta Pixel — placeholder ID)
├── scheduling/
│   └── index.html          ← Non-ICP booking page (no pixel)
├── terms/
│   └── index.html          ← Terms of Service (DRAFT — needs attorney)
├── privacy/
│   └── index.html          ← Privacy Policy (DRAFT — needs attorney)
├── logos/                  ← 28+ builder logo images for the marquee
├── CNAME                   ← apply.deckingleads.com
├── .gitignore
├── package.json + node_modules/   ← Puppeteer for screenshot.mjs
├── serve.mjs               ← node serve.mjs → http://localhost:3000
├── screenshot.mjs          ← node screenshot.mjs <url> [label]
├── temporary screenshots/  ← screenshot output, gitignored
└── PROJECT-STATE.md        ← this file
```

---

## How V1 / V2 / V3 differ (the test matrix)

V3 changes only **one variable** vs V1 (the long-form lead) so any A/B/C delta is attributable cleanly.

| Element | V1 | V2 | V3 |
|---|---|---|---|
| Hero (eyebrow / H1 / triple-guarantee numbered list / button) | same | same | same |
| Logo marquee | same | same (logo paths absolute) | same (logo paths absolute) |
| Skeptic-defuse content between marquee and proof | none | one-paragraph Brian Wallace pull-quote | full Version B long-form lead (~365 words, 8-section direct-response structure, gold-bordered "too good to be true" callout) |
| Apply form position | bottom of page (after FAQ) | between proof and guarantee | bottom of page (same as V1) |
| Apply form steps | 6 (own-business / pain / revenue / timing / name / contact) | **4** (pain step + separate name step removed) | 6 (same as V1) |
| Final CTA after FAQ | none (apply IS the bottom) | "Still reading?" callout that scrolls back to apply | none (same as V1) |
| Footer | small (logo + tagline) | **full legal footer** (6-paragraph disclaimer + privacy/terms links + © SeasonProof Growth LLC) | small (same as V1) |
| Redirect paths from form | relative (`qualified/`, `scheduling/`) | absolute (`/qualified/`, `/scheduling/`) | absolute (`/qualified/`, `/scheduling/`) |
| `<meta robots>` | indexable | `noindex,nofollow` | `noindex,nofollow` |

**Spencer's current preference:** V2. He likes the form moved up + 4-step survey.

**Outstanding:** the legal footer block is on V2 only. Once Spencer signs off on the language, port to V1 and V3 (one Edit each).

---

## Key technical details

### ICP routing rule (lives in JS submit handler)

```js
function isICP(d) {
  if (d.own_business !== 'yes') return false;                                  // hard gate: not a deck builder
  if (d.revenue === 'under_500k' && d.timing === 'researching') return false;   // loose gate: tiny + low intent
  return true;                                                                   // everyone else → /qualified/ (pixeled)
}
```

V1 uses 6 fields (own_business, pain, revenue, timing, name, contact). V2 uses 4 (own_business, revenue, timing, name+contact merged). The ICP rule references only own_business + revenue + timing, so it works on both.

### Form step structure
- V1 + V3: 6 steps (separate name step, separate contact step)
- V2: 4 steps (combined name+email+phone+submit on the final step)

### Name validation
`first word ≥ 2 chars + space + ≥ 1 char of second word` — i.e., "Spencer W" is the minimum to enable Next/Submit. Rule is identical across all three.

### Loading state on submit
4 seconds with three rotating messages: "Checking your zip code…" → "Verifying market availability…" → "Loading your booking calendar…" → redirect.

### Video lightbox (proof grid)
Every wired proof card opens in an on-page lightbox modal — no redirect to YouTube. ESC, click-outside, and a Close button all close the modal and stop playback (`iframe.src = ''`).

### Wired proof cards (10 total)
1. **Justin Wylie** · All Pro Decks · `youtu.be/YJQxX5ZQ3aI` · "CPL $400 → $30 in 14 days"
2. **Brian Wallace** · Bend Fence & Deck · `youtu.be/4TP1sTRASoA` · "60 estimates · 25 closed · 6 weeks"
3. **Jacob Weaver** · `youtu.be/Xt4TVn4zP7s` · "$500K last year → $1M by April 21"
4. **Chip Paynter** · Paynter Construction · `youtu.be/ERQ84Dgz-Ow` · "$200K from 4 leads · 21 days"
5. **Ricardo Cervantes** · Colorado · `youtu.be/djsZ_YNn7wY` · "$105K closed in 7 days"
6. **Eric Engle** · Mr. Patio Cover · `youtu.be/kK3oXzLb4-0` · "65–70 appointments per week"
7. **Justin Wylie #2** · `youtu.be/_djYzxfITps` · "$1.2M closed in slow season"
8. **Mike Biviano** · Biviano General · `youtu.be/NV836FEEIcU` · "$12K spent → $225K profit"
9. **Mike Holst** · Foremost Construction · `youtu.be/vxqYn1E86LA` · "52 appointments in 10 days"
10. **Jason Flynn** · PROdeck Construction · `youtu.be/thmY9E9PYqY` · "$100K/mo → $500K/mo in 90 days"

### Logo marquee
`/logos/` folder contains 28 wordmarks/PNGs/SVGs. CSS `.logo-cell--invert` flips dark logos to white via `filter: brightness(0) invert(1)`. `.logo-cell--card` wraps logos with white backgrounds in a soft cream pill so they look intentional. Marquee sized at 70% of original (height 62px, gap 40px). Trust label `whitespace-nowrap` so it never breaks to two lines on mobile.

### Sticky bottom CTA
Visible on mobile after scrolling past hero. Hides itself when the apply section comes into view (`getBoundingClientRect`).

### Section color rhythm (V1)
black hero → charcoal logo bar → paper-white proof → black guarantee → cream system → charcoal FAQ → dark apply section (with gold-bordered triple-guarantee callout) → black footer

V2 same rhythm but the apply section moves to between proof and guarantee, and footer is full legal block.

V3 inserts a charcoal section (the long-form lead) between marquee and proof, then continues with V1's rhythm.

### Debug logs
`[DL]` logs in V1 + V3, `[DL v2]` in V2. Logs `formData`, ICP check inputs, ICP result, and redirect target on submit. Open DevTools → Console BEFORE submitting to see them.

---

## Currently open threads

### High priority

| # | Item | Notes |
|---|---|---|
| 1 | **Meta Pixel ID** | `qualified/index.html` has `YOUR_PIXEL_ID` placeholder in two spots (script init + noscript img). Spencer to provide. Find/replace. |
| 2 | **Attorney review of `/terms/` and `/privacy/`** | Both pages have a "This is a draft" callout at the top. Should be reviewed by counsel before scaling Meta traffic. Section 3 of `/terms/` (the 100-in-100 conditions) should mirror Spencer's actual signed Engagement Agreement word-for-word. |
| 3 | **Legal footer port to V1 + V3** | The full legal disclaimer block currently lives only in V2 footer. Once Spencer approves the V2 language, copy the same `<footer>` to V1 and V3 (one Edit each). |
| 4 | **V2 ICP routing diagnosis** | An earlier reported bug — Spencer entered "all non-ICP entries" and got routed to `/qualified/`. Debug logs were added; resolution status unconfirmed. Re-verify by walking a known non-ICP combo (under_500k + no crews equivalent in V2's 4-step variant — need own_business=yes + revenue=under_500k + timing=researching to land on /scheduling/). |
| 5 | **Two `[bracketed placeholders]` in `/terms/` + `/privacy/`** | (a) Governing Law state in `/terms/` § 10. (b) Mailing address (both pages, Contact section). Need real values. |

### Medium priority

| # | Item | Notes |
|---|---|---|
| 7 | **Real builder logos in marquee** | Currently using actual logo PNGs from `/logos/`. If Spencer wants additional builders rotating through, drop new files in `/logos/` and add `<div class="logo-cell">` entries. |
| 8 | **A/B/C ad-set test setup** | When Spencer is ready: split Meta traffic 1/3 each between V1, V2, V3 at the ad-set level. Track scroll-depth past hero, scroll-depth past lead, form-start, form-completion, ICP-rate. Threshold: ~100 visitors per arm before drawing conclusions. |

### On the shelf

- Hero testimonial video clip — there's a placeholder image position; Brian Wallace clip never embedded. Low priority since the proof grid does the work.
- Booking confirmation post-booking page (with mini-VSL script Spencer drafted earlier at `2026-04-24-booking-confirmation-mini-vsl.md`). Not part of the LP itself; lives in GHL.
- SMS sequence — the script lives in `2026-04-24-v1-launch-funnel-copy.md`. Wire-in lives in GHL automations, not in this codebase.

---

## Recent decisions worth preserving

- **Spencer's preferred LP version:** V2.
- **Eric Engle = Mr. Patio Cover.** Same person; Eric is owner, Mr. Patio Cover is brand. One card, not two.
- **Hero ends at the button.** No trust micro-line below the button (decision dated 2026-04-27). Trust marquee is the first thing below the fold by design.
- **Numbered triple guarantee in hero:** "1. We literally pay you $2K / 2. Refund every penny / 3. Work for free until the 100th" with gold numerals + white items. (Originally rendered as a paragraph with scattered bolding — Spencer rejected; numbered list has cleaner rhythm.)
- **H1:** "More Deck Jobs / Guaranteed." (no period after "Jobs," line break via `<span class="block">`, "Guaranteed." in gold).
- **CTA copy:** Outcome on top (`GET MORE DECK JOBS`, large, uppercase, bold), action below (`Reserve My Zip Code →`, smaller, semibold). Used consistently across hero CTA, between-section CTAs, sticky mobile CTA, and top utility-bar CTA.
- **Eyebrow on LP** = `· 1 BUILDER PER MARKET` (no green pulse — that's reserved for the terminal pages' MARKET OPEN status). Eyebrow on terminal pages = `● MARKET OPEN · APPLICATION ACCEPTED` with green pulse.
- **Marquee size reduced 30%** vs initial implementation.
- **Trust banner is a scrolling marquee** (not text-only city list). Cities list moved out, replaced with builder logos (per Spencer's spec).
- **Logo paths in v2 + v3 are absolute (`/logos/...`)** not relative. Critical fix — relative paths broke in subfolders.
- **Apply section style:** dark bg, gold-bordered "100 in 100 Triple Guarantee" callout panel above the white form card, modeled after Ravi's "7-Day Alignment Guarantee" pattern.
- **Form name validation:** requires "first + space + 1+ char of last name" (e.g., "Spencer W" enables Next/Submit).

---

## Brand & voice references

If a fresh session needs to write copy on this project, read these first:

- `/Volumes/T7/SPG/3. FULFILLMENT/Operations/SOPs/voice-guide.md` — Spencer's voice (direct, anti-BS, contractor-friendly, no excessive em dashes — they look AI-generated)
- `/Volumes/T7/SPG/3. FULFILLMENT/Operations/SOPs/dream-client-avatar.md` — Justin Wylie (the dream client). Avatar's #1 reflex on cold offers: "this sounds too good to be true." V3's whole long-form lead is built around defusing that exact phrase.
- `/Volumes/T7/SPG/3. FULFILLMENT/Operations/SOPs/business-context.md` — full SPG / DeckingLeads context, offer stack, customer journey
- `/Volumes/T7/SPG/1. MARKETING/Meta Ads/Strategy/Master Offer Doc/Master_Offer_Doc_SPG_v2.md` — canonical offer doc (the "Kevlar thread"). Any LP copy should not contradict this.
- `/Volumes/T7/SPG/1. MARKETING/Proof/0. Master Library/Master Testimonial Library.md` — every named-client soundbite organized by objection. Any new proof card's stat overlay should match this library.

---

## Coaching context (informs how to work with Spencer)

- `/Volumes/T7/SPG/0. FOUNDATIONS/Coaching Calls/FOCUS-ANCHOR.md` — read this if Spencer is spiraling, second-guessing, or asking for options. The León framework + April 27 tactical layer.
- `/Volumes/T7/SPG/0. FOUNDATIONS/Coaching Calls/Spencer-Operating-System.md` — the 8 cognitive patterns Joe diagnosed. Especially relevant on this project: Pattern 1 ("and also" loop), Pattern 3 (pre-solving paralysis).
- `/Volumes/T7/SPG/0. FOUNDATIONS/Coaching Calls/SECOND-BRAIN.md` — top-of-doc has the April 27 30-day operating contract. The LP work falls under "Roadmap 1 — The Bet" of the Q2 Roadmap.
- `/Users/spencerwright/Downloads/SPG Q2 2026 Quarterly Roadmap.docx` — the contract Spencer signed with himself for Q2.

**Auto-memory entries that govern how to engage:**
- `feedback_speed_over_perfection.md` — when Spencer is mid-decision, pick one and commit; don't enumerate options.
- `project_30_day_pivot_2026-04-27.md` — pause hiring conversations until ~May 27. Don't propose third funnel architectures beyond V1/V2/V3 dual-test.

---

## How to resume the project (concrete moves)

When you re-open this project in a new session:

1. **Read this file.**
2. **Read the FOCUS-ANCHOR** so you know how to work with Spencer (the León rules + the speed-over-perfection feedback).
3. **Check the live deploys.** `curl -sL https://apply.deckingleads.com/` and `/v2/` and `/v3/` to see what's live. Compare against the local files in this directory.
4. **Check open threads above (Section: Currently open threads).** Pick the highest-priority one Spencer is ready for. Don't start something new without confirming.
5. **If Spencer asks "what do I do next" without specifying:** the live priorities are (a) Meta Pixel ID, (b) attorney review of `/terms/` + `/privacy/`, (c) port the legal footer to V1 + V3, (d) wire any new proof video URLs he's captured.
6. **If Spencer asks for CRO refinements:** see V2 + V3 for what's already been tested as variants. Don't propose a fourth architecture without justification.

---

## Local dev workflow

```bash
# from this directory:
node serve.mjs                 # http://localhost:3000 — serves index.html
node screenshot.mjs http://localhost:3000           # screenshot to ./temporary screenshots/
node screenshot.mjs http://localhost:3000 v2-test   # labeled screenshot
```

Git workflow: commit + push deploys to GitHub Pages within ~60 sec.

```bash
# after edits:
git add <files> && git commit -m "..."
git push
```

Verify deploy:
```bash
gh api repos/morejobcalls/deckingleads-apply/pages/builds --jq '.[0]'   # latest build status
curl -sL https://apply.deckingleads.com/                                 # confirm content is live
```

If a user reports "I don't see my changes":
1. Confirm `gh api ... pages/builds` shows `"status":"built"` for the latest commit.
2. `curl -sL https://apply.deckingleads.com/ | grep <something-from-recent-commit>` to verify server-side.
3. If it's on the server but not in their browser, it's client cache — incognito window definitively confirms.

---

*This file is a living snapshot. Update it after material project changes so the next pickup is clean.*
