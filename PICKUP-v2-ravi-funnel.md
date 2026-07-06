---
client: SPG / MoreJobCalls.com
project: apply.morejobcalls.com — v2 funnel rebuild (mirror Ravi's pop-up application flow)
status: LIVE (cutover complete)
percent_complete: 100
last_touched: 2026-07-05
blocker: none — v2 funnel is LIVE at root (tag funnel-v2-2026-07-05). Watch bookings for the first day.
next_action: Monitor bookings 24h. Optional cleanup: delete redundant /next/ folder. Rollback if needed: git checkout funnel-v1-2026-07-02 -- index.html && push.
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

## ✅ LIVE VALIDATION (2026-07-03)
`/next/` pushed live (commit `d413a39`, noindex). Drove the modal through all 8 steps on the real domain via browser automation — **GHL calendar renders correctly** (45-min widget, contact pre-filled, timezone auto-detected, open days). Confirms the local blank calendar was only a localhost artifact. Stages 1+2 verified working end-to-end live.
**Only remaining unknown for Stage 3:** whether a completed booking's GHL redirect to `/confirmation/` (ICP) or `/scheduled/` (non-ICP) carries the appointment time. → Spencer to test-book on `apply.morejobcalls.com/next/` and paste the resulting URL. (Claude did NOT book — a real booking fires Spencer's live GHL workflows + creates a calendar slot; left for Spencer.)

## 2026-07-03 — modal revisions (deployed, commit `3eb4703`)
Per Spencer's feedback on the live preview:
- **Survey is now a full-screen BLACK immersive takeover** — centered (overlay `align-items:flex-start` + card `margin:auto`), opaque black overlay + black card (no floating light card), all text/options swapped to light-on-black, gold progress bar + gold CTA. LP stays light. (Modal `<style>` in `/next/index.html`.)
- **Bottleneck streamlined 8 → 4 options:** not_enough_appts, feast_famine, referral_ceiling, not_sure.
- **CRITICAL FIX — calendar Schedule button was unreachable** (GHL "Enter Details" view taller than the `scrolling="no"` fixed-height iframe → button clipped, booking blocked). Now: iframe `scrolling="yes"` + `height:74vh` (min 540) + overlay scrolls; `form_embed.js` also auto-grows the iframe (verified 911px live). Button should now always be reachable. **Needs Spencer's real test-booking to confirm end-to-end** (headless automation can't render GHL time-slots to complete a booking).
- **Full-name prefill:** now also passes `name` + `full_name` params (covers GHL single "Full Name" field) alongside first/last.

**Verified live:** black theme + centered + 4-option bottleneck render correctly; calendar renders + `form_embed` resizes. Time-slot selection → Enter Details → Schedule not reproducible in headless (works for real users per Spencer's screenshot).

### 2026-07-03 (cont.) — survey re-styled to Ravi like-for-like + guarantee restored (commit `bf4549f`)
- **Reversed the all-black survey** per Spencer: survey card is now a **LIGHT Ravi-matched card** (white #FFF, dark text, gold, subtle "Next" text-link) on a **near-opaque dark backdrop** `rgba(0,0,0,.9)` (page barely visible behind). Centering + calendar scroll fix retained. Verified in preview.
- **Restored the guarantee section:** hiding the whole `#apply` section for the modal had also hidden the "100 in 100 Double Guarantee" reiteration. Now `#apply` is visible again showing header + guarantee callout + a gold CTA (`[data-open-apply]` → opens modal); only `#form-card` is hidden. Verified in preview.

## ✅ STAGE 3 — DONE + verified live (2026-07-03, commit `f069c02`)
The add-to-calendar (Ravi's show-rate lever) works with the correct appointment time.

**Root cause recap:** GHL exposes NOTHING useful for the time — `{{appointment.start_time}}` in the redirect URL resolves EMPTY (confirmed via Spencer test → `?start=&end=&tz=`), and the `msgsndr-booking-complete` postMessage only carries `calendarId` + fingerprint (no time). The GHL **API** does return it, so we fetch it there.

**The Worker — `mjc-appointment-time`:**
- URL: `https://mjc-appointment-time.spencer-80c.workers.dev` (POST `{contactId, calendarId}` → `{found, startUTC, endUTC, title, location, appointmentId}`).
- Source: `Foundations/Cloudflare-Workers/mjc-appointment-time/` (wrangler.jsonc + src/index.js). Deploy: `export CLOUDFLARE_API_TOKEN=…; npx wrangler@4 deploy`. Secret `GHL_API_KEY` = location PIT (set with `printf "%s" "$PIT" | wrangler secret put GHL_API_KEY` — **no trailing newline or you get ghl_401**). Vars: `LOCATION_TZ=America/Chicago`, `ALLOW_ORIGIN=https://apply.morejobcalls.com`.
- Calls `GET /contacts/{contactId}/appointments`, picks the most-recent confirmed on that calendar, converts naive-local (America/Chicago) start/end → UTC ISO. Verified: 4:00 PM CDT → `2026-07-02T21:00:00Z`.

**Wiring (all in `/next/`):**
- **Modal** (`next/index.html`): on `msgsndr-booking-complete`, stashes `localStorage.mjc_booked_ref = {contactId, calendarId, t}` (contactId captured from the `set-sticky-contacts` message via regex `"id":"…"`; calendarId from booking-complete). Replaced the temp discovery logger.
- **Confirmation pages** (`next/scheduled/` + `next/confirmation/`): add-to-cal block (hidden) + script that reads `mjc_booked_ref` (if fresh <15 min) → POSTs the Worker with retry (6×/1.3s for GHL propagation) → renders Google + `.ics` links + a local-tz "when" line → clears the ref.
- **Verified live** on `apply.morejobcalls.com/next/scheduled/` by seeding a real `mjc_booked_ref` (contact `DVdxkHZMpumGcmNuuRoC`) → block rendered "Thursday, July 2 at 4:00 PM CDT" with working links, ref cleared. CORS locked to apply.morejobcalls.com (won't work from localhost — test on the live domain).

**⚠️ The GHL calendar redirect points to ROOT `/scheduled/` + `/confirmation/` (shared with LIVE v1).** So a real /next/-modal booking lands on the ROOT pages, which DON'T yet have the add-to-cal reader. To see the full real flow before cutover, either add the (hidden, ref-gated, zero-regression) reader to root, or wait for cutover (when root BECOMES v2). Can't repoint the GHL redirect to /next/ without affecting live v1 (same calendars).

## ✅ Confirmation pages reskinned to light (2026-07-03, commit `2d6723e`)
ROOT `/confirmation/` + `/scheduled/` (the pages the GHL redirect lands on — these ARE the v2 confirmation pages, shared w/ v1) flipped to the light Ravi theme. Method: replace-all on the inline values — `background:#0D0D0D`→`#FBFAF7`, `background:#161614`→`#FFFFFF`, `color:#F8F7F3`→`#1A1917`, `rgba(248,247,243,`→`rgba(26,25,23,`, `rgba(255,255,255,`→`rgba(26,25,23,` (+ space variants) — plus logo-marquee filter flip on /confirmation/ (grayscale+brightness(0) / multiply). add-to-cal box is now a white card w/ gold time. Verified in preview across hero, three-things, logo wall, proof grid, guarantee, footer. **v1 bookers now also get a light confirmation** (acceptable — funnel going light).

## REMAINING
1. **Cutover** — replace root `index.html` (LP) with the v2 `/next/index.html` (light LP + modal). Root `/confirmation/` + `/scheduled/` are ALREADY v2 (reskinned + add-to-cal reader). Tag `funnel-v2-YYYY-MM-DD` snapshot at cutover; log in CHANGELOG.
2. **Delete vestigial `/next/confirmation/` + `/next/scheduled/`** clones (unused — the flow redirects to root). And `/next/index.html` becomes root at cutover.
3. Discovery-logger already removed. Worker `mjc-appointment-time` is temporary-secret-based; keep.

## HOW TO RESUME
1. Read this file. Read `CHANGELOG.md`.
2. `cd` to `Marketing/Website/Landing Pages/v1-launch-page`; `node serve.mjs` → preview `http://localhost:3000/next/index.html` (open the modal via the CTA or `window.__openApply()` in console).
3. Decide with Spencer: push `/next/` preview live (so he can test the modal + real calendar), or continue Stage 2 → Stage 3.
4. Screenshot previews with the puppeteer pattern used this session (deviceScaleFactor 2; run the script from inside `v1-launch-page/` so it resolves puppeteer).
