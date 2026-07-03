---
client: SPG / MoreJobCalls.com
project: apply.morejobcalls.com — v2 funnel rebuild (mirror Ravi's pop-up application flow)
status: in_progress
percent_complete: 60
last_touched: 2026-07-03
blocker: Stage 3's time-fix + calendar rendering can only be verified on the LIVE domain — needs /next/ pushed + a test booking
next_action: Push /next/ preview live → Spencer test-books on apply.morejobcalls.com/next/ + pastes the resulting redirect URL (reveals whether GHL passes the appointment time) → Claude completes Stage 3
owner: Spencer (decision) / Claude (build)
---

# PICKUP — apply.morejobcalls.com v2 (Ravi-mirror pop-up funnel)

**One-line:** Rebuilding the apply funnel to mirror Ravi Abuvala's structure — a **pop-up multi-step application** (contact-early, calendar-last) that **redirects to a confirmation page carrying the appointment time**, which fixes the broken add-to-calendar and lifts show rate. Light theme, Spencer's copy verbatim. v1 is snapshotted and untouched.

## Why we're doing this (root cause)
Spencer's **58% show rate**. Ravi's single biggest show-rate lever (took him to **84%**) is an **"add to calendar" button on the confirmation page** — but Spencer's page can't add it because **the booked appointment time never reaches the confirmation page**. Root cause: the v1 calendar is an **inline iframe on the same page as the application**, and the post-booking break-out redirect to `/confirmation/` (ICP) or `/scheduled/` (non-ICP) **drops the appointment time** (lands on a clean URL, no params). Ravi solves this with a native calendar-last step whose GHL redirect carries the time. So we mirror that.

## SNAPSHOT — v1 is frozen & safe
- **Git tag:** `funnel-v1-2026-07-02` → commit `149f413` in repo `morejobcalls/deckingleads-apply`. Restore with `git checkout funnel-v1-2026-07-02`.
- **Change log:** `CHANGELOG.md` at repo root (v1 description + limitation + v2 plan).
- v1 is **LIVE and untouched**. All v2 work is isolated in the **`/next/`** subfolder → previewable at `apply.morejobcalls.com/next/` once pushed. v1 stays live until an explicit cutover.

## DECISIONS LOCKED (Spencer approved)
- **Platform:** keep the custom static site (this repo), NOT rebuild in GHL.
- **Look:** LIGHT theme (Ravi's cream #FBFAF7 / dark text #1A1917 / antique gold #C7963F). Whole funnel.
- **Fidelity:** mirror Ravi's STRUCTURE + flow + interaction; Spencer's brand skin; **Spencer's copy verbatim.**
- **Scope:** whole funnel end-to-end (landing page + pop-up application + calendar + confirmation).
- **Contact captured EARLY** (steps 2–3). Reason (Spencer's): sticky-contact preloads the calendar in the background so the last step loads instantly.
- **Keep both existing GHL calendars** (ICP + non-ICP) + the existing `isICP` routing.
- **Step 5 = annual revenue** (Spencer's existing bands).
- **Bottleneck question ADDED**, tailored to his ICP from the Voice-of-Qualified-Buyer extraction — **approved as-is.**

## Ravi's funnel (the reference)
URL: `https://www.scalingwsystems.com/dfyf-free-training-vsl-1` (mapped 2026-07-02; screenshots reviewed).
Flow: single-page VSL → "Book a Free Call" opens a **pop-up modal**: gate (Yes/No) → full name → email+phone → bottleneck → revenue → timing → **calendar (GHL widget, ~3-day window, auto timezone)**. Progress bar throughout; single-click advances on choice steps; "Next" on text steps. Contact captured early. Confirmation page = "you're booked, [name], scheduled for [time]" + **Add to Calendar**.

## v2 FLOW (8 steps — Ravi's structure, Spencer's questions)
`1 Gate (own_business Y/N) → 2 Name → 3 Email+Phone → 4 Bottleneck → 5 Annual revenue → 6 Timing → 7 Service ZIP → 8 Calendar (routed ICP/non-ICP, pre-filled)`
- Adds ZIP (Spencer's "one deck builder per market" market-check) vs Ravi's 7-step.
- **Approved bottleneck options** (field `bottleneck`): not_enough_appts ("I close when I'm in front of them") · feast_famine ("My lead flow is unpredictable") · referral_ceiling · tire_kickers · crew_busy · plateaued · agency_burned · not_sure.

## EXISTING MECHANICS (ported verbatim into v2 — do not change)
- **ICP rule:** `isICP` = `own_business === 'yes'` AND revenue NOT in (`under_500k`, `500k_1m`). (i.e., deck builder + $1M+/yr.)
- **Calendars:** `CAL_ICP = https://api.seasonproofgrowth.com/widget/booking/6Ck4IfG5SatgIkAZJ7yo` → GHL redirect `/confirmation/` (pixeled). `CAL_NON_ICP = https://api.seasonproofgrowth.com/widget/booking/lNcyqnixLoZa2p3S5P8I` → `/scheduled/`. Both pre-filled via `?first_name=&last_name=&email=&phone=&zip=`.
- **GHL runtime:** `<script src="https://api.seasonproofgrowth.com/js/form_embed.js">` (resizes the calendar iframe).
- **GHL inbound webhook:** `https://services.leadconnectorhq.com/hooks/X6hS5G8dcD7NqDBOVDNP/webhook-trigger/90c90b32-ded8-44eb-8743-c0d29f3c7675` (payload now includes `bottleneck`; carries hashed PII for Meta CAPI + attribution).
- **Meta Lead:** `fbq('track','Lead', …, {eventID})` fires **ICP-only** with an `event_id` (crypto.randomUUID) that dedupes vs server-side CAPI. Non-ICP must NOT fire (don't train the model).

## ✅ STAGE 1 — DONE (pop-up modal built + verified)
File: **`/next/index.html`**. Changes made to the clone:
1. Old inline `#apply` section set to `display:none` (kept in DOM so the legacy app-logic IIFE inits without error).
2. Injected a self-contained modal before `</body>`: `#mc-overlay` / `#mc-card` with namespaced `#mc-*` IDs, own `<style>`, own IIFE. 8 steps, progress bar (`#mc-bar-fill`, PROG map 8→40→65→75→82→90→96→100), Back/Close, single-click `.mc-opt` handlers, `[data-next]` (name / email+phone) + `[data-next-zip]` validation, `isICP`, **calendar preload on revenue answer** (`preloadCalendar()`), `submitAndShowCalendar()` (fires Meta Lead + GHL webhook + sessionStorage, then reveals calendar), attribution reuse from `localStorage.dl_attribution`.
3. Every `a[href="#apply"]` CTA wired to open the modal (`preventDefault` + `openModal()`). QA hook: `window.__openApply()`.
- **Verified in headless preview:** all 8 steps advance; formData captured correctly incl. `bottleneck`; `isICP` → true for $1M–3M deck builder; `event_id` + sessionStorage set. Screenshots looked right (gate, bottleneck w/ subtitles, calendar chrome).
- **Known preview caveat:** the GHL calendar iframe renders BLANK on localhost/headless (GHL checks embed domain). It WILL paint on the live `apply.morejobcalls.com` domain (same as v1). **Must verify on live domain.**

## ✅ STAGE 2 — DONE (light reskin of the landing page)
`/next/index.html` is now fully LIGHT (Ravi's cream/gold), verified across all viewports.
- **How it was done (token flip, not markup surgery):** in the tailwind config (~line 43) the dark-theme tokens were remapped to light: `bg→#FBFAF7, surface/elevated→#FFF, charcoal→#F3EEE4, border→#E4DECF, ink→#1A1917, ink-muted→#6B6A63, ink-subtle→#8A8780` (paper-* + gold untouched). And the CSS section classes: `.sec-dark{background:#FBFAF7;color:#1A1917} .sec-charcoal{background:#F3EEE4;color:#1A1917}`. This flipped the whole page since text utilities (`text-ink`, etc.) now resolve dark.
- **Logo marquee fix (~line 382):** dark-bg filters swapped for light — `.logo-cell img{filter:grayscale(1) brightness(0)}`, `.logo-cell--invert img{filter:grayscale(1) brightness(0)}`, `.logo-cell--card img{filter:grayscale(1);mix-blend-mode:multiply}` (drops white logo backgrounds on cream).
- The modal (Stage 1) uses its own hardcoded light colors, so it was unaffected. Proof section was already light.
- Minor cosmetic-only remnants (acceptable): the Biviano `--card` logo shows a faint box (white×cream multiply); footer copyright line is light-gray fine print.

## ⏳ STAGE 3 — TODO (confirmation pages + THE time fix)
- `/next/confirmation/` (ICP) and `/next/scheduled/` (non-ICP): add the **add-to-calendar** block at the top (Ravi's 84% lever).
- **Add-to-calendar block is preserved at `/next/_add-to-calendar-WIP-reference.html`** (it's the /scheduled/ page with the block already in the hero). The block: hidden by default; reads appointment start/end/tz/title from URL params (aliases: `event_start_time`,`start_time`,`start`,…); builds Google Calendar + `.ics` (Apple/Outlook) links; event title defaults to "100 Deck Jobs in 100 Days Strategy Session"; shows a friendly "when" line. Verified working with a test `?event_start_time=` param.
- **THE fix:** make the GHL post-booking redirect **carry the appointment time** to the confirmation page. Two levers: (1) the modal's calendar iframe break-out must forward the appointment params to the top-window redirect; and/or (2) adjust each GHL calendar's redirect-URL setting (in GHL UI) to append appointment merge fields. **Needs Spencer to confirm/adjust the 2 calendars' redirect settings** — Claude gives exact steps once the confirmation page is ready to receive params.
- Also apply the meeting-invite/reminder title change ("100 Deck Jobs in 100 Days Strategy Session") — separate quick GHL edit (from the coaching-call action list).

## OTHER OPEN LOOPS FROM THIS SESSION (not this funnel)
- **Command-Hub skill** (deferred, spec'd): `Foundations/Coaching Calls/_planned-command-hub-skill.md` — new skill on top of /second-brain, coaching/consulting only, build in a focused session.
- **Coaching-call action items** (Ravi 6/29 + Tyler 6/30) live in `Foundations/Coaching Calls/by-coach/{Ravi,Tyler}.md` + `SECOND-BRAIN.md`: add-to-calendar (this funnel), tighten booking window to 3 days, rename meeting title, static + montage ads, weekly proof KPI, post numbers in SWS Slack (closer search).
- **Biviano ~$100K proof card** — DONE this session, live on morejobcalls.com homepage + apply LP + yt LP + confirmation grid.

## HOW TO RESUME
1. Read this file. Read `CHANGELOG.md`.
2. `cd` to `Marketing/Website/Landing Pages/v1-launch-page`; `node serve.mjs` → preview `http://localhost:3000/next/index.html` (open the modal via the CTA or `window.__openApply()` in console).
3. Decide with Spencer: push `/next/` preview live (so he can test the modal + real calendar), or continue Stage 2 → Stage 3.
4. Screenshot previews with the puppeteer pattern used this session (deviceScaleFactor 2; run the script from inside `v1-launch-page/` so it resolves puppeteer).
