# MoreJobCalls Apply Funnel — Change Log

Repo: `morejobcalls/deckingleads-apply` → live at **apply.morejobcalls.com** (GitHub Pages, deploys from `main`).

Each funnel structure is preserved as an **immutable git tag** so we can always return to and reference exactly what was live. To view/restore any snapshot: `git checkout <tag>`.

---

## v1 — SNAPSHOT (frozen 2026-07-02)

- **Tag:** `funnel-v1-2026-07-02`
- **Commit:** `149f413`
- **Status:** LIVE and untouched. This is the current production funnel as of 2026-07-02.

### What v1 is
A custom static site (HTML + Tailwind CDN) on GitHub Pages. Structure:
- **Landing page** (`/index.html`) — hero + VSL + proof sections + guarantee, with a **GHL booking calendar embedded as an iframe on the same page as the application** (no redirect to a separate GHL calendar page).
- **YouTube-traffic variant** (`/yt/`).
- **Post-booking pages:** `/scheduled/` (non-ICP) and the ICP variant — reached via a GHL redirect after booking. These show "you're booked," a Text-Yes-to-confirm SMS CTA, a pre-call video, and proof.
- Proof cards, logo wall, and the Biviano ~$100K win card (added 2026-06-30).

### Known limitation driving the v2 rebuild
The booked appointment's **date/time is NOT passed to the post-booking page** — the redirect lands on a clean URL (`https://apply.morejobcalls.com/scheduled/`) with no query params. Root cause: the calendar is an **iframe embedded on the same page as the application**, rather than a native booking step that redirects with appointment parameters. This blocks Ravi's single biggest show-rate lever — the **"add to calendar" embed on the confirmation page (took his show rate to 84%)** — because the page can't know the time to put on the calendar.

An add-to-calendar block was built and verified against test params (saved WIP: `scheduled-with-addcal-WIP.html` in the session scratchpad) but cannot activate on v1 because no time reaches the page.

---

## v2 — LIVE (cutover 2026-07-05)

- **Tag:** `funnel-v2-2026-07-05` · **Status:** LIVE at root (apply.morejobcalls.com).
- **What shipped:** light Ravi-mirror LP + a pop-up multi-step application (contact-early, progress bar, single-click, 4-option bottleneck), calendar-last (both ICP/non-ICP GHL calendars), and an **add-to-calendar** on the confirmation pages powered by the `mjc-appointment-time` Cloudflare Worker (fetches the appointment time from the GHL API, since GHL won't pass it via redirect or postMessage). Confirmation pages (`/confirmation/` + `/scheduled/`) reskinned to light. Spencer's copy verbatim.
- **Cutover mechanics:** root `index.html` replaced with the v2 LP; `robots` flipped noindex→index; lead webhook `source`/`variant` matched to v1 (`'deckingleads.com lp v1'` / `'v1'`) + new `lp_version:'v2-ravi'` tag so existing GHL automations keep firing while v2 leads stay identifiable.
- **Verified before flip:** desktop + mobile layout, real bookings (Spencer's phone), Meta pixel + Lead, GHL webhook, add-to-calendar with correct time.
- **Instant rollback:** `git checkout funnel-v1-2026-07-02 -- index.html && git push` (~2 min) restores the v1 front page. (Confirmation pages stay v2 but degrade gracefully for v1 traffic — add-to-cal is ref-gated.)
- **Cleanup TODO:** `/next/` folder is now a redundant noindex duplicate — safe to delete. `mjc-appointment-time` Worker + its PIT secret are load-bearing (keep).

## v2 — PLANNED (in design as of 2026-07-02)

**Goal:** mirror Ravi Abuvala's funnel STRUCTURE / UI end-to-end, keeping **Spencer's copy verbatim** (do not change copy).

**Target structure (from Ravi's 2026-06-29 call description):**
- Application opens as an **expanding pop-up/modal on the same page** (not a new page).
- **Contact info captured FIRST**, qualifying questions after; **calendar is the LAST step.**
- Progress bar (fills ~75% after contact info), single-click question advances, calendar preloaded/pre-filled.
- Booking **redirects to a real confirmation page that receives appointment params** → unlocks the **add-to-calendar** feature (the WIP block gets wired in here).

**Build/cutover plan:** TBD pending Spencer's answers (platform: keep custom static site vs. rebuild native in GHL; scope: whole page vs. apply→calendar flow; Ravi funnel reference URL). v1 stays live and untouched until v2 is verified and cut over. This log records the cutover when it happens.

### v1 → v2 rationale (one line)
Change the calendar from a same-page iframe to a native, redirecting last-step booking so the confirmation page receives the appointment time — enabling the add-to-calendar show-rate lever and matching Ravi's higher-converting pop-up application flow.

---

## v2.1 — Partial-lead capture (STAGED DARK 2026-07-09, not yet activated)

- **Status:** Code shipped to `index.html` behind a kill switch (`PARTIAL_WEBHOOK_URL=''` = OFF). Inert until the GHL workflow exists and its webhook URL is pasted into that const.
- **Build spec for the GHL side:** `PARTIAL-LEAD-workflow-spec.md` (this repo).
- **Scope:** root `index.html` only. `/d/` and `/a/ /b/ /c/` are stale v1-era variants with no ad traffic — intentionally not patched.

### The problem (found during 2026-07-08 funnel audit)
The application modal collects **email + phone at step 3 of 7**, but the lead webhook fires only after the **final step (ZIP)**. Anyone who types their contact info and then bails on the bottleneck/revenue/timing/ZIP questions is a lead we already had in the browser and never sent to GHL. Verified in code: single `submitAndShowCalendar()` fire, `submitted` guard, no partial capture. These leads are currently invisible — we don't even know how many there are (Clarity funnels suggest step drop-off exists on every multi-step form).

### The hypothesis
Some meaningful % of form-starters abandon *after* the contact step. Capturing them at that moment and following up (one soft SMS + one email after a delay) will recover a fraction into completed applications and booked calls, at zero cost to the experience of leads who complete normally. If ~10–20% of contact-step completers abandon and even a quarter of those recover, that's several extra booked calls per month at current traffic.

### What the change does (mechanics)
1. `firePartialLead()` fires **once**, the instant step 3 (email+phone) validates — a background `fetch` with `keepalive`; the form advances exactly as before. Zero UX change, zero added latency.
2. It posts to a **dedicated** GHL inbound webhook (workflow "1a. Partial Lead"), NOT the main lead webhook — so the main "1. New Lead" workflow, its **Meta CAPI Lead event**, and its notifications never fire for partials. **Meta optimization data stays clean and before/after Lead counts stay comparable.**
3. Payload carries `lead_stage:'partial'` + `partial_step:'contact-info'` + name/email/phone/own_business + full attribution (UTMs, fbclid, referrer). The full-submit payload now also carries `lead_stage:'full'` for symmetric reporting.
4. GHL upserts by email/phone, so a partial who later completes merges into ONE contact — the `survey-submit` tag then pulls them out of the partial nurture before anything sends (same gate pattern as the abandoned-booking nurtures).

### Known edge cases (accepted)
- `partialSent` fires once per page load: if a lead enters a wrong email, advances, then goes Back and fixes it, only the first email is captured as a partial. The full submit still carries the corrected one. Rare; accepted for simplicity.
- Consent: the SMS disclaimer sits ON the contact step, shown before the number is entered, so a follow-up text is covered — but partial-nurture copy must be "finish your application," not call reminders (they never booked).

### Measurement — how we'll know if it's better
Baseline is frozen in GHL history; the split lives in the GHL workflow, not the page:
- **Capture ALL partials** (no downside to capturing), but **50/50 split the follow-up** inside the "1a. Partial Lead" workflow: arm A `partial-nurture-a` gets the SMS+email; arm B `partial-holdout-b` gets silence. The holdout measures how many partials come back on their own — the honest control.
- **Primary metric:** partial→`survey-submit` completion rate, arm A vs arm B. **Secondary:** partial→appointment-booked rate, and appointment show rate of recovered leads vs organic leads (guards against "we recovered junk").
- **Context metric (before/after):** weekly full opt-ins + booked calls vs the pre-2026-07-09 baseline, to confirm nothing regressed.
- Reporting: `partial_lead_report.py` (growth-metrics scripts) pulls GHL contacts by tag + date window and prints the table. Tags do all the work — no new tracking infra.
- **Decision rule:** run ≥4 weeks or ≥100 partials, whichever comes first. Keep if arm A completion beats arm B by a meaningful margin AND recovered leads show at a rate comparable to organic leads. Otherwise roll back.

### Rollback (the way back to exactly-now)
Three independent levers, any one of which fully stops the behavior:
1. **Instant kill (30 s):** set `PARTIAL_WEBHOOK_URL=''` in `index.html` and push. Feature is dark again — this restores today's behavior exactly (the dormant code is a no-op).
2. **GHL-side kill:** unpublish the "1a. Partial Lead" workflow — LP requests then hit a dead webhook and nothing is created; lead capture for completed applications is untouched.
3. **Full code revert:** `git checkout funnel-v2-2026-07-05 -- index.html && git push` (pre-partial snapshot; tag exists from the v2 cutover).
Contacts created during the test stay tagged `partial-optin` so they can be filtered out of any report after a rollback.

---

## v2.2 — Hero congruency fix + guarantee-drift cleanup (2026-07-10, STAGED — not yet pushed)

- **Status:** Edited locally, awaiting Spencer review. Repo deploys from `main` (GitHub Pages), so pushing = publishing. Note the working tree also carries the uncommitted v2.1 dark-staged partial-lead code — commit deliberately.
- **Why:** Ads lead with "20 deck jobs in 100 days"; the LP hero led with "100+ Sales Appointments." That's the exact ad→LP scent break the Master Offer Doc §7 rule 1 / §2 diagnostic note warns about. Also found two guarantee drifts while in there.

### Changes — root `index.html`
1. **H1:** `Get 100+ Sales Appointments In 100 Days Or You Get Paid In 2 Ways:` → `20 Deck Jobs In 100 Days — Here's The Math:`
2. **Subheadline:** `100% Refund + $2,000 Credit` → `The system guarantees 100 exclusive sales appointments in 100 days. Close 2 of every 10 — that's your 20 jobs. Miss the 100? 100% refund of your management fee + $2,000 cash.`
   - Compliant with Offer Doc v2.3 framing rule: 20-jobs number travels with its 2-of-10 condition in the same breath; the guaranteed noun (and both remedies) stay anchored to the 100 appointments; "guaranteed" never attaches to the jobs number; system (not Spencer) gets the credit.
   - Fixes two drifts: **"$2,000 Credit" → "$2,000 cash"** (canonical remedy is cash, not credit) and adds the required **management-fee scoping** on the refund.
3. **`<title>`:** `More Deck Jobs. Guaranteed. | DeckingLeads` → `100 Sales Appointments In 100 Days, Guaranteed | MoreJobCalls.com` — old brand removed; "Guaranteed" now attaches to appointments, not jobs. (No og:title tag on the page, so this is what link previews scrape.)
4. **Eyebrow badge:** `More Deck Jobs Guaranteed` → `100 Appointments Guaranteed` — caught in preview: directly above the new 20-jobs H1, the old badge attached "guaranteed" to the jobs number (v2.3 violation). New badge doubles as the precision-anchor over the framing headline.

### Final hero copy (Spencer revision, 2026-07-11 — supersedes items 1, 2, 4 above)
- **Pill:** `#1 Deck Job AI Solution of 2026` (new claim, not yet in the Offer Doc — flagged)
- **H1:** `20 Deck Jobs in 100 Days` ("in 100 Days" in gold)
- **Subhead:** `The Deck Jobs System Guarantees 100 Exclusive Sales Appointments in 100 Days With Qualified Homeowners In Your Area. You close 2 of every 10 – that's your 20 deck jobs. Miss the 100? 100% refund + $2,000 cash paid to you.` — Spencer's wording verbatim. NOTE: refund is unscoped here (no "management fee") — flagged as drift vs Offer Doc v2.3; Spencer's call.
- **CTA button:** `GET 20 DECK JOBS` / `Claim Your Zip Code →`; text under button: `1 Builder Per Market` (replaces `100+ Contractors Served - $100M+ Jobs Sold`). Top-nav button still `Reserve My Zip Code →`.

### Flag resolutions (2026-07-11)
- **Unscoped refund → resolved via fine print.** Spencer's call: hero stays unscoped; the footer "Guarantee Terms" disclaimer now carries the canonical delineation — refund applies to fees paid directly to MoreJobCalls.com LLC (management fees), excludes third-party ad spend. Offer Doc updated to v2.4 to sanction this path (copy rule 4 amendment).
- **"#1 Deck Job AI Solution of 2026" → approved + registered** in Offer Doc v2.4 §2 (Registered Positioning Claims), along with "The Deck Jobs System" as an alias of the Decking Growth Operating System.
- **Known follow-up:** footer legal paragraphs still name SeasonProof Growth LLC as the contracting entity (Engagement Agreement, testimonials, copyright) — inconsistent with the 2026-07-03 MoreJobCalls.com LLC entity switch and the rebranded /terms/. Needs a deliberate sweep, not patched here.

### Changes — `/yt/index.html`
- Same `<title>` fix; subheadline `100% Refund + $2,000 Credit` → `100% Refund Of Your Management Fee + $2,000 Cash`.
- **Hero H1 intentionally NOT changed** on /yt/ — YouTube traffic doesn't come from the 20-jobs Meta ads, and its 100-appointments headline is already canonical.

### Not touched
- Below-the-fold guarantee section (already canonical: mgmt-fee scoping + cash, line ~782), ToS, contract — per Offer Doc v2.3, no changes required there.
- `/a/ /b/ /c/ /d/` stale variants — no ad traffic, not patched (same policy as v2.1).

### Rollback
`git checkout main -- index.html yt/index.html` before commit; after ship, revert the commit or restore hero block from this entry's "before" strings.

---

## v2.3 — Legal entity sweep: SeasonProof Growth LLC → MoreJobCalls.com LLC (2026-07-11)

- **What:** All footer legal references (Guarantee Terms, Testimonials, No Affiliation, © line) now name **MoreJobCalls.com LLC** as the contracting entity, matching the 2026-07-03 entity switch and the already-rebranded /terms/ + /privacy/ (which correctly keep SeasonProof Growth LLC as a named affiliate/former name — untouched).
- **Files:** root, /yt/, /yt/scheduled/, /confirmation/, /qualified/, /scheduled/, /scheduling/, /a/ /b/ /c/ /d/, /next/* — every clean, tracked, deployed page.
- **Skipped:** /e/–/h/ (untracked, not deployed), index-pre-tyler archive, /v2/–/v6/ (working copies carry other sessions' uncommitted edits — their deployed versions still say SPG LLC; fix when those dirs are next committed).

---

## v2.3.1 — Meta descriptions synced to new hero (2026-07-11)

- Root: description now mirrors the 20-jobs hero (was "Or you get paid in 2 ways"). /yt/: description still referenced the RETIRED third prong ("paid three ways") — now canonical two-prong with mgmt-fee scoping inline (meta tags have no fine-print surface).
