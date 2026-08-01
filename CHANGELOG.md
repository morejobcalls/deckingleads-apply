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
- **v2.3.2 (2026-07-11):** root `<title>` → `20 Deck Jobs in 100 Days | MoreJobCalls.com` (congruent with hero; framing-only — no "Guaranteed" on the jobs number, condition lives on-page). /yt/ title unchanged (appointments-led hero).

## v3.0 — Ravi-style proof flow + Billy Stewart live threads (2026-07-17)

- Replaced the flat proof grid with a 4-section flow: **proof cards** (10 case studies in Spencer's order: Stewart, Wallace, Wylie, Biviano, Flynn, Weaver, Cervantes, Gallegos, Engle card-only, Paynter) → **video wall** (order preserved; added Billy Gallegos 7/16 video `woPfBuocx-M`; Flynn overlay now "$500K month on $3K in ads") → **The Receipts** → **"Two Guarantees. Zero Risk."**
- The Receipts: two live-scroll iMessage phone recreations — Billy Stewart week-1 thread (playable video bubble → "$191,300.86" → forehead-kiss line, verbatim) and the group thread with rep "Tim G." ($151K week, $96K day) — plus the Biviano ~$100K card. Assets in `/wins/billy-thread/`; originals archived in `Marketing/3. Proof/Billy Stewart (Trinity)/wins/2026-06_191k-text-thread/`. Billy approved publishing 2026-07-17.
- Guarantee section mirrors Ravi's "Two Guarantees. Zero Risk." pattern — refund prong then $2K prong, remedies anchored to the 100 appointments; footer fine print (Offer Doc v2.4) unchanged.
- A parallel session's uncommitted 7/17 index.html rework is preserved untracked at `index-other-session-backup-2026-07-17.html`.

## v5.0 — Merged proof architecture: v4 Ravi cards × v3 live threads (2026-07-17, Spencer-approved)

Single merge of the two parallel 7/17 reworks (this session's v3 + the other session's v4 backup), reviewed and confirmed by Spencer.

- **#proof cards = v4's richer design** (dark cards, accent top-bars, face avatars from `/proof-faces/`, hook-quote video thumbnails, Watch-the-call + /learn/ case-study links), **reordered to Spencer's canonical sequence**: Stewart, Wallace, Wylie, Biviano, Flynn, Weaver → CTA row → Cervantes, Gallegos, Engle, Paynter, + extras Brown, Holst.
- **Stat lines rewritten per Spencer (transformation always explicit with units):** "$1,657 Ad Spend → $300K+ Jobs" · "25 Deck Jobs in 6 Weeks" · "$400 → $30 Appointments" · "Appointments: 3/Wk → 11/Day" · "$80K/Mo → $500K/Mo" (Flynn baseline per Spencer 7/17) · "$500K/Yr → $500K/Mo" (Weaver) · "$105K Closed · First 7 Days" · "$50K Signed · Month One" · "$4M/Yr → $8M/Yr" (Engle updated stats: CAC cut to a third, 75 appts/wk, ~20 jobs/wk, $50M goal) · "$200K From 4 Appointments" · "$1,600 Ad Spend → $100K Jobs" · "52 Appointments · First 10 Days". "Leads" labels replaced with appointments language (client verbatim quotes untouched).
- **#receipts = Billy Stewart live iMessage phones (v3) + v4's 7-screenshot masonry.** "Want to see more?"/"Browse all client wins" box REMOVED per Spencer — masonry flows straight into #guarantees. Lamar Homes + Antonio Colon receipts confirmed cleared by Spencer 7/17.
- **#guarantees = v4's "Two Guarantees. Zero Risk."** section unchanged (fee-scoped, compliant).
- New tracked assets: `proof-faces/*.jpg` + `SOURCES.md`, `wins/win-*.png` (7), `RAVI-CARD-BRAND-GUIDELINE.md` (measured Ravi design system — source of truth for card design + future wins.html port).
- Follow-up parked: morejobcalls.com wins page cards need the same personality treatment (other repo).

## v5.1 — /book/ self-book page for opt-in-no-book leads (2026-07-21, LIVE dark — unlinked + noindex, pending Spencer's review before any SMS goes out)

- **New page `/book/`** — direct self-booking link for leads who opted in but never booked (sent by SMS when they reply "yes"). Approved 20-jobs hero (verbatim from root LP, incl. eyebrow + subhead + Offer Doc v2.4 fine print) with the calendar directly underneath.
- **Calendar is NATIVE, not an iframe** — the GHL widget is click-dead in cross-origin iframes (verified 2026-07-15), and SMS links open in iPhone Safari where that failure bites hardest. Slots render as day pills + time buttons, localized to the visitor's browser timezone, fetched from the new **`mjc-self-book` Cloudflare Worker** (`https://mjc-self-book.spencer-80c.workers.dev`, source in `Foundations/Cloudflare-Workers/mjc-self-book/`), which proxies GHL free-slots and creates the appointment server-side (confirmed status, Google Meet link, assigned user — full parity with widget bookings; contact tagged `self-book-page`).
- **ICP split mirrors the main funnel:** `?icp=yes|no` (from `contact.icp_qualified_survey`) picks the calendar (ICP `6Ck4IfG5SatgIkAZJ7yo` / non-ICP `lNcyqnixLoZa2p3S5P8I`) and the post-book redirect — ICP → `/confirmation/` (fires BookedCall pixel), non-ICP → `/scheduled/` (no pixel, by design). Missing/empty icp defaults to ICP.
- **Link params** (all optional): `first_name` (greeting), `cid` (`{{contact.id}}` — books against the existing contact, no dupe), `icp`, plus `last_name/email/phone` fallbacks. Bare link works too: inline name/phone/email fields appear before the confirm button.
- Recommended GHL SMS template: `https://apply.morejobcalls.com/book/?first_name={{contact.first_name}}&cid={{contact.id}}&icp={{contact.icp_qualified_survey}}`
- Meta pixel PageView + Clarity on page; `noindex,nofollow`. E2E verified 2026-07-20 (headless click-through → real GHL appointment created → deleted; test contact removed).

## v5.2 — Phone-input country-code bug fix (2026-07-24 → completed 2026-07-27)

**The bug (found 2026-07-24 via Anthony Cicero, who never received his SMS).**
Every LP phone field normalized input with `value.replace(/\D/g,'').slice(0, 10)`. When a lead typed or autofilled their number **with the leading US country code** (`1 909 816 9213` = 11 digits), `.slice(0, 10)` kept the **first** ten digits and silently dropped the **last** one. The formatter then rendered the corrupted value as a plausible-looking `(190) 981-6921`, validation (`phone.length === 10`) passed, and the LP sent `'+1' + phone` → **`+11909816921`** to GHL.

Result: an undeliverable number, so **no SMS in the entire nurture/confirmation sequence ever reached the lead** — and nothing surfaced the failure. The lead looked like a normal opt-in.

**Blast radius:** 4 of 104 paid-traffic contacts with phones in the Data Brain (~3.8%) — Anthony Cicero (7/22), Caleb Hopke (7/22), Virgil D Ward (6/07), Mark Herrneckar (5/18). Anthony's real number was recovered from his calendar-booking submission (he re-typed it there) and corrected in GHL to `+19098169213`. The other three never booked, so their dropped digit is unrecoverable from GHL — first 9 digits known, last digit gone. Email intact for all three.

**The fix — phone fields only (zip + CAPI-hash paths untouched):**
1. **Strip the country code before truncating**, chained onto the existing digit-strip:
   `.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '').slice(0, 10)`
   The lookahead only fires at exactly 11 digits, so it never eats a digit mid-typing — the field self-corrects on the 11th keystroke (`(190) 981-6921` → `(909) 816-9213`).
2. **Same normalization at submit time**, because autofill can set `.value` without firing an `input` event.
3. **Real validation instead of a length check:** `/^[2-9]\d{9}$/.test(phone)` — NANP area codes can never start with 0 or 1, so any future corruption of this class now shows the lead an inline error instead of silently saving a dead number.

**Files SHIPPED:** `index.html` + `next/index.html` (both the main form and the `mc-` modal), plus `a/ b/ c/ d/ yt/index.html` (main form). These carry the phone fix and nothing else.

**Files fixed locally but NOT shipped in this commit:** `v2/ v3/ v4/ v5/ v6/index.html` also carry an unrelated, unreviewed first-touch-attribution block from another session — shipping them would push that work live too, so they're held back. `e/ f/ g/ h/index.html` are untracked (never deployed). All are fixed on disk and will go out whenever their own work is reviewed.

**Rollback:** `git revert` this commit — the change is 3 lines per form, no structural edits.

### v5.2b — v2–v6 shipped (2026-07-27)

The held-back variants were still **live and still buggy** — verified by fetching the deployed pages: `/v2/ /v3/ /v4/ /v5/ /v6/` each served two phone fields with zero country-code strips and zero `[2-9]` validators, three days after the root fix went out. Every other deployed page (`/ /a/ /b/ /c/ /d/ /yt/ /next/`) confirmed fixed live.

Resolved by committing **only** the 3 phone-fix lines per file: the working-tree copies were reset to `HEAD`, the 3 edits re-applied to the clean files, and those committed. The first-touch-attribution block from the other session was then restored to the working tree and remains **uncommitted and unreviewed** — exactly as before, just no longer blocking a live bug fix. Verified diff before commit: 15 insertions / 15 deletions across 5 files, phone lines only, zip normalization untouched.

`e/ f/ g/ h/` confirmed **404 on the live site** — untracked and never deployed, so they carried no exposure. They stay untracked.

**Verified after deploy:** all five variants serve 2 strips + 1 `[2-9]` validator each.

### v5.3 — Pre-call page overhaul, Chung audit round 1 (2026-07-27)

From Chung Tang's funnel audit (kick-off call 7/27): booked leads weren't consuming the pre-call content — 12 hero-video views against ~120 bookings in two months — and the one-tap "Yes" confirm carried no commitment. Show rate is the constraint; these pages are the lever.

**`/confirmation/` + `/scheduled/` (both restructured identically):**
1. **Hero video swapped + promoted.** The placeholder mini-VSL YouTube embed (`CZkMmNpZddg`) is gone; the proof-heavy "EVG VSL On Opt In" (1:58 — offer → results wall → CTA) is now **self-hosted** at `media/precall-proof.mp4` (6.8MB 720p, poster `media/precall-proof-poster.jpg`) and plays native/inline directly under the hero. No YouTube chrome, no related-video exit ramps.
2. **Step 2 = personalized pre-filled text.** `Text "Yes" To Confirm` → `Text Me To Lock It In`, body pre-filled as "Hey Spencer, it's {first} — just booked my call. Locking in my spot for {zip}…" with real name+zip injected from the LP's `dl_qualify_data` sessionStorage (bracketed placeholders as fallback). Same 3920 iMessage line.
3. **Proof wall → sequential player.** The tap-to-play grid (14 cards on /confirmation/, 10 on /scheduled/) — the surface behind the 62.5% dead-click rate Clarity flagged on /scheduled/ — replaced by ONE story at a time (Billy → Brian → Biviano → Flynn → Wylie) with a "Watch the next one →" swap. Consumption over catalog, per Chung's course-page principle.
4. **Zoom → Google Meet** in all copy (calls are Meet; the mismatch was eroding trust). Also fixed on `/yt/scheduled/` and the LP `index.html` modal sub-line — those two files carry only that one-line fix.
5. `/scheduled/` also lost its duplicate "Step 2 — Bring These Three Things" prep section (already removed from /confirmation/ in an earlier commit).

**Held back (unchanged):** `v2–v6/index.html` still carry the other session's uncommitted first-touch-attribution work; `PROJECT-STATE.md`/PICKUPs untouched.

**Rollback:** `git revert` this commit. The old grid/JS lives in git history only.

### v5.4 — Unlisted-YouTube pre-call video + Calendly test for non-ICP bookings (2026-07-27)

Round 2 of the Chung audit implementation, same day as v5.3.

1. **Pre-call video now serves from YouTube unlisted (`OBdbWCVxGws`)** on `/confirmation/` + `/scheduled/`, replacing the v5.3 self-hosted `media/precall-proof.mp4` embed (files kept in repo). Rationale: watch counts become visible in YT Studio — Chung's "12 views in 2 months" diagnostic stays checkable — and this matches the original Ravi rule comment. A **"Watch the next video ↓"** button under the player anchors to the sequential proof player (`#keep-watching`), completing Chung's watch → text → watch-next layout.
2. **CALENDLY TEST (non-ICP only):** sub-$500k leads now book on Calendly (`pt-20-jobs-in-100-days-video-1`, same 45-min Meet event) instead of the GHL yellow-calendar widget — Spencer's call: better booking UI, and the $25 reservation fee can be collected natively by Calendly. Implemented in BOTH booking flows (modal `buildCalUrl()` + legacy `runLoadingThenShowCalendar`) behind a **kill switch: `NON_ICP_USE_CALENDLY=false` restores the GHL calendar instantly** — no other edits needed. ICP path untouched.
3. **Booking bridge:** on Calendly's `event_scheduled` postMessage the page beacons the lead (name/email/phone/zip) to a NEW GHL inbound webhook — workflow "Calendly Booking Bridge (tags booked) — CLAUDE DRAFT" (`a23922b4…`, trigger `HgeZ5W08aasOAxfiTIAo`) — which tags `booked` + `booked-via-calendly` so no-book nurture/AI-setter logic treats them as booked. Then redirects to `/scheduled/` (~1.2s), preserving the funnel flow. ⚠️ The bridge workflow is DRAFT — **it must be published in GHL before the tag fires**; until then Calendly bookings are invisible to GHL (known gap: leads who close the tab before the beacon are missed regardless — a server-side Calendly webhook is the belt-and-braces follow-up).
4. Known non-blockers: Calendly bookings don't create GHL appointments, so the post-booking iMessage workflow (drafted today) won't fire for this segment until a server-side bridge creates appointments; `/scheduled/` add-to-calendar block hides itself gracefully (no GHL appointment to find).

**Rollback:** flip `NON_ICP_USE_CALENDLY` (and `NON_ICP_USE_CALENDLY_L`) to `false`, or `git revert`.

### v5.5 — Dark Imperium-style post-booking pages + corrected pre-call video (2026-07-27)

Round 3, same day. Spencer's direction: model the post-booking experience on go.imperiumacquisition.com/thank-you-*, keep Chung's one-video-at-a-time consumption directive, dark theme.

1. **Full rebuild of `/confirmation/` + `/scheduled/`** (fresh files, shared template): black (#0D0D0D/#141414) + gold, pill band at top ("⚠ IMPORTANT: YOUR CALL HAS BEEN TENTATIVELY SCHEDULED ⚠"), caps headline ("WATCH THE VIDEO BELOW AND COMPLETE THE STEPS TO CONFIRM YOUR CALL"), video front-and-center, then Imperium-style 3 step cards: (1) add to calendar — static copy + the dynamic add-to-calendar block when a booking ref exists, (2) confirm via personalized pre-filled text (same sessionStorage name+zip injection), (3) anchor to the sequential proof player. Then white-chip logo marquee, one-story-at-a-time player, guarantee restate, reschedule, footer. Tailwind CDN dropped (unused). Preserved per page: iframe breakout, Meta pixel BookedCall on /confirmation/ ONLY (none on /scheduled/, by design), Clarity on both, mjc-appointment-time worker fetch.
2. **Pre-call video corrected:** the v5.4 upload was the WRONG cut (old edit with a flaw Spencer caught). New master `1. MARKETING/EVGVSL new edit 07272026.mov` (1:49) uploaded unlisted → **`YNhnO9332U4`**; embeds swapped on both pages; the wrong upload `OBdbWCVxGws` set PRIVATE on YouTube. Repo fallback `media/precall-proof.mp4` + poster replaced with the new cut (7.1MB 720p). The post-booking iMessage draft workflow's video attachment was also swapped to the new cut (GHL media `323d0d9b-…`).
3. **LP index.html:** Calendly listener slimmed — the GHL-inbound-webhook beacon removed (the server-side `calendly-ghl-webhook` Worker now owns tagging + appointment mirroring; the temp draft GHL bridge workflow was deleted). Listener keeps funnel tracking + the /scheduled/ redirect.

**Rollback:** `git revert` this commit (previous light-theme pages live in history).

### v5.5.1 — Pre-filled confirmation text, Spencer's wording (2026-07-27)

Both post-booking pages: pre-filled iMessage body is now *"Hey Spencer, it's {first} from [company]. Just booked a call. Looking forward to seeing how the 20 deck jobs in 100 days process could work for us here in {zip}."* First name + zip auto-fill from the application (sessionStorage); `[company]` is a deliberate overtype placeholder — the application doesn't collect company name, and typing it adds the commitment friction the confirm step is for.

### v5.6 — Chung feedback round 2: 3-step simplification (2026-07-27)

Chung's direct spec, verbatim where possible, still Imperium dark UI. Both post-booking pages (`/confirmation/` + `/scheduled/`):

- **H1:** "COMPLETE THE 3 STEPS BELOW TO CONFIRM YOUR CALL" (Spencer chose 3 steps over Chung's 2 — Step 3 = calendar, matching Imperium's own triplet).
- **STEP 1 — CONFIRM YOUR TERRITORY:** "Is this where you want more deck jobs?" + Chung's copy; button renamed **"Confirm My Territory With Spencer"** (same pre-filled iMessage: first name + zip auto-fill, [company] overtype). Text is now the FIRST action on the page.
- **STEP 2 — WATCH BEFORE WE TALK:** back to the **native** video per Chung's "[ADD NATIVE VIDEO]" — self-hosted corrected cut (`media/precall-proof.mp4`, 1:49) with gold play overlay. (YouTube embed retired after ~2h; `YNhnO9332U4` stays unlisted for SMS/nurture links.)
- **STEP 3 — PUT IT ON YOUR CALENDAR:** accept-the-invite copy + the dynamic add-to-calendar buttons when the booking ref resolves.
- **CUT per Chung's simplification:** step-card row, trusted-by logo marquee, sequential proof player, guarantee card. Proof now lives inside the video. Footer gains the 20-jobs/refund fine-print line (v2.4 scoping path).
- Ops note (manual, not automated): when the Step-1 text lands, Spencer replies in the "Perfect, thanks {name} — I'll take a look at {city} before we talk" pattern to make the flow feel 1:1.

**Rollback:** `git revert` (v5.5 layout in history).

### v5.6.1 — Zip-personalized Step-1 headline (2026-07-27)

Both post-booking pages: Step 1 H2 becomes "Is {zip} where you want more deck jobs?" — zip injected from the application's sessionStorage (same source as the SMS prefill), falling back to the generic "Is this where you want more deck jobs?" when storage is empty.

### v5.6.2 — Add-to-calendar works for Calendly bookings (2026-07-27)

Step 3's add-to-calendar buttons (mjc-appointment-time worker) previously only rendered for GHL-widget bookings (needed a contactId ref). Now: the LP stashes an **email-based ref** when Calendly fires `event_scheduled`, the worker accepts `{email}` and resolves the contact + the **mirrored** GHL appointment (created server-side by calendly-ghl-webhook seconds after booking), and the pages retry up to ~13s to ride out mirror lag. GHL-widget bookings unchanged.

### v5.7 — Phone backspace bug + segment-split booking copy + official Calendly embed (2026-07-27)

**1. Phone input backspace bug (ALL live forms).** Spencer caught it live: with the formatter emitting trailing separators at exactly 3 digits ("(512) ") and 6 digits ("(512) 366-"), backspace deleted the separator and the immediate re-format restored it — digit count never dropped. Leads could NOT correct a wrong digit in positions 1–3 (once 3 typed) or position 6. Fix: format thresholds moved from ≥3/≥6 to ≥4/≥7 so a trailing separator only ever appears with a digit after it — every backspace now removes a digit (verified by simulated typing + backspacing). Shipped to `index.html` (both forms), `next/`, `a/ b/ c/ d/ yt/`, and `v2–v6` (the v2–v6 fix isolated from the other session's uncommitted attribution work, same procedure as v5.2b; their working-tree copies also carry the fix now).

**2. Booking-step copy split by segment** (`index.html` modal step 8):
- Non-ICP: H1 "Reserve Your Territory — $25, 100% Refundable" · H2 "20+ Deck Jobs in 100 Days or You Get Paid $2,000." · H3 "($25 reservation is fully refundable on request and refunded automatically if we're not a fit.)"
- ICP: H1 "One last step — Reserve your territory and pick a time that works for you" · H2 same offer line · NO $25 messaging.

**3. Non-ICP calendar embed → Calendly's official widget.js** (Spencer's snippet): dark/gold params (`background_color=000000&text_color=b98700&primary_color=b98700`), mounted via `Calendly.initInlineWidget` with name/email prefill inside `#mc-cal-wrap` (GHL iframe hidden, not removed — kill switch still restores everything). Legacy inline flow keeps the styled URL via `CALENDLY_NON_ICP`.

### v5.7.1 — FINAL pre-call VSL cut everywhere (2026-07-27)

Spencer delivered the final polished proof VSL (1:58, Jeff Haring/Window Prof results slides). Now serving in every slot: native video on `/confirmation/` + `/scheduled/` (`media/precall-proof.mp4`, 7.4MB 720p + new poster), **unlisted YouTube `R9mX0UyONjI`** (SMS/nurture link use), the LIVE "1. New Lead" no-book iMessage 2 attachment, and the draft post-booking workflow attachment (both GHL media `b0e2cc1c-…`). Prior unlisted upload `YNhnO9332U4` set private.

### v5.8 — Imperium step cards + all-white text + white Calendly text (2026-07-27)

Spencer's polish round (mobile-first — ~80% of traffic is FB in-app webview):
1. **Post-booking pages:** the 3 steps are now Imperium-style **cards** — #141414 panels, gold border, gold STEP label — stacked full-width (Charlie Morgan's step-card look, kept single-column since our Step 2 holds a full video, not a thumbnail). Body copy bumped from muted cream (rgba .55) to near-white (rgba(255,255,255,.88)) for dark-bg mobile readability. Section paddings tightened between cards.
2. **Application booking step:** Calendly widget `text_color` b98700 → **ffffff** — white text on black, gold stays as the accent/primary. (Interpreted from Spencer's lost screenshot: gold-on-black body text in the embed was the readability problem.)

### v5.8.1 — HOTFIX: non-ICP Calendly widget never rendered (2026-07-27)

Spencer caught it live: the booking step showed no calendar for non-ICP leads. Root cause: Calendly's widget.js auto-scans `.calendly-inline-widget` divs on load and hard-crashes (`parseOptions: Cannot read properties of null`) when the div lacks `data-url` — our host div carried the class but passed the URL only to the manual `initInlineWidget` call. Fix: the div now carries `data-url` (with name/email prefill params) and lets widget.js auto-mount; if the script is already loaded, `initInlineWidget` is called on a class-less div instead. Verified with a full scripted non-ICP application run — widget iframe mounts, dark/gold/white theme renders. **Exposure window: ~40 minutes** (v5.7 push → this fix); non-ICP leads in that window saw copy but no calendar (GHL fallback was NOT shown — flag stayed on).

### v5.9 — Calendar preload + segment routing ported to ALL live pages (2026-07-27)

1. **Calendar preloads in the background at the revenue answer** (the first moment ICP vs non-ICP is known — name/email/phone already captured and prefilled). By the zip step the calendar is rendered; the final submit no longer reloads a preloaded GHL iframe (previously the zip param change forced a full reload, throwing the head start away). Tradeoff: ICP GHL widget no longer prefills zip — leads retype 5 digits in exchange for an instant calendar.
2. **Wrong-combo fix:** `/d/` (LIVE split arm) + `/a/ /b/ /c/` still routed non-ICP to the GHL yellow calendar with the old "Last Step — Pick A Time" copy. All four now get the segment copy swap (non-ICP: "Reserve Your Territory — $25, 100% Refundable" + offer + refundable line · ICP: "One last step — Reserve your territory…" + offer) and the non-ICP → Calendly branch (same kill switch pattern, `NON_ICP_USE_CALENDLY_L`), plus the booked→/scheduled/ redirect listener with the email ref for add-to-calendar. Verified end-to-end on /d/.
3. **`/next/` got the full modal port** (segment copy ids, setCalCopy, Calendly mount with the data-url fix, no-reload submit; revenue-preload hook already present).

### v5.10 — Calendly embed restyle + calendar reveal now ~0.4s (2026-07-27)

1. **Embed params per Spencer:** `background_color=000000&text_color=ffffff&primary_color=b98700` → `primary_color=dba400` (Calendly default light theme, gold accent) — all six booking pages.
2. **The 3–5s calendar wait killed.** Two causes: a fixed 1.4–1.5s "Checking your market availability…" spinner even when the calendar was already warm, and NO preload at all on the legacy-flow pages (`/d/ /a/ /b/ /c/` collect contact info last). Now: modal pages skip the spinner (250ms) when preloaded; legacy pages **start loading Calendly while the lead types their phone number** (name/email prefilled from the fields above) and reveal in 400ms. Measured: root 366ms, /d/ 414ms from submit-click to visible calendar.

### v5.11 — ICP boundary corrected: $500k–$1M is ICP (2026-07-28)

Spencer's call: non-ICP = **under $500k only**. The $500k–$1M revenue answer was routing to the non-ICP path (Calendly + $25 reservation) — it now routes ICP (green GHL calendar, no $25 messaging). Fixed in every isICP definition: root (modal + legacy), /next/ (both), /d/ /a/ /b/ /c/, /yt/, and /v4/ /v5/ /v6/ (isolated from the other session's uncommitted work, v5.2b procedure). /v2/ /v3/ use the older pre-Calendly gate and can't reach the $25 page — untouched. Note: $500k–$1M leads now also fire the Meta Lead event (ICP-gated), which matches the intent — they're dream-client adjacent, not repelled.

### v5.12 — Confirmation pages: DR-UI polish + YouTube embed + case studies restored (2026-07-28)

Per Spencer, modeled on the Imperium reference:
1. **Headlines re-set:** forced `<br>`s removed from the H1 and Step-1 headline (bad mobile wraps) — natural balanced wrapping (`text-wrap:balance`), hero padding tightened, wider gold hairline under the H1 and **gold divider rules between every step card** (Imperium's section-rule pattern).
2. **Step-1 card visual** (Imperium card-example style): a live iMessage-blue bubble PREVIEW of the pre-filled text, personalized with the lead's real name/zip by the same script that builds the sms: link — the card now *shows* the message before they tap.
3. **Pre-call video → unlisted YouTube embed** (`R9mX0UyONjI`, already uploaded yesterday) on both pages — watch counts visible in YT Studio. Native mp4 stays in the repo as an asset.
4. **"RECENT CLIENT CASE STUDIES" section after Step 3** — the curated one-story-at-a-time player restored (Billy → Brian → Biviano → Flynn → Wylie) with the next-button, per Chung's consumption rule (no grid).

### v5.12.1 — Zoom → Google Meet on /next/* (2026-07-28)

Spencer caught a surviving "Zoom link" line on the application. The v5.3 sweep missed the `/next/` tree: its modal contact-step sub-line + its own `/next/confirmation/` and `/next/scheduled/` pages (9 mentions total). All now say Google Meet. GHL widget forms + calendar copy re-verified clean.

### v5.13 — Non-ICP booking back on the GHL yellow calendar (2026-07-28)

Spencer's call: the Calendly test ends; sub-$500k books on the GHL yellow calendar again, with the $25 collected IN the GHL widget (Accept Payments). Implemented via the kill switches (`NON_ICP_USE_CALENDLY(=_L)=false` — Calendly code stays dormant for instant re-test), plus what payment-in-iframe needs: **`allow="payment"` on every booking iframe** + **`form_embed.js`** loaded (root modal + legacy, /next/, /d/ /a/ /b/ /c/). The legacy phone-typing preload now warms the correct **GHL** calendar for BOTH segments (with name/email/zip prefill — legacy collects zip before contact info, so nothing is lost) and submit never clobbers a preloaded iframe. Verified: root non-ICP → yellow widget in 368ms with Reserve-Your-Territory copy; $500k–$1M → green ICP calendar; /d/ → yellow widget, zip prefilled, 410ms.

## 2026-07-29 — Pre-call proof reel live on all confirmation pages

- **Swapped the "Watch Before We Talk" video** on `/confirmation/` + `/scheduled/` (was `R9mX0UyONjI`) and the mini-VSL placeholder on `/yt/scheduled/`, `/next/confirmation/`, `/next/scheduled/` (was `CZkMmNpZddg`) → **`HRYuMJmhpmY`** — the Proof-Reel VSL v2 (12 clients, 10 objection chapters, burned captions, 1.25x, 11:38, unlisted "Before Your Call: 12 Deck Builders Who Didn't Believe It Either").
- Updated Step-2 copy + duration line on the two live pages to match (was "~2:00").
- Source of truth: `Marketing/1. Ads/Supercuts/Proof-Reel-VSL-v2/` + `Marketing/3. Proof/0. Master Library/PICKUP-proof-reel-vsl.md`.

## 2026-07-30 — Non-ICP booking step: reservation copy reframed

- **`#mc-cal-h3` on step 8 of the root modal application** (`index.html`) — the line that only renders on the **non-ICP** path (`setCalCopy()` with `icp === false`; ICP still sees no $25 messaging).
- Was: `($25 reservation is fully refundable on request and refunded automatically if we're not a fit.)`
- Now: **"You're not buying our service today."** + line break + **"You're simply reserving your territory while Spencer reviews your application and creates a plan. Your $25 is fully refundable on request or if we're not a fit."**
- Why: leads the moment with what the $25 *isn't* (a purchase) before the refund mechanics — removes the "am I buying something right now?" hesitation at the payment step.
- **Scope: root `index.html` only**, per Spencer. `/a/ /b/ /c/ /d/ /next/` still carry the old parenthetical — stale variants, no ad traffic.
- **Spacing follow-up (same day):** `#mc-cal-h3` given `margin-top:12px` (was flush against the bold offer line above it), and the `<br><br>` between the two sentences replaced with a block `<span>` at `margin-top:8px` — the two lines now read as one paragraph pair instead of two separated blocks.

## 2026-08-01 — `/ig/` organic-Instagram funnel (STAGED DARK — awaiting Spencer's review before push)

A complete traffic-segmented clone of the root funnel for **organic Instagram** (bio link, story links, DMs), on the `/yt/` precedent. Design is **byte-identical to root** — the only diffs are meta tags, pixel event names, attribution, and routing. No existing page was touched.

**Pages:** `/ig/` (LP + inline 5-step application + modal application) · `/ig/confirmation/` (ICP) · `/ig/scheduled/` (non-ICP).

- **Pixel isolation (the point of the split).** `/ig/` fires **`IG_Lead`** (`trackCustom`), never the standard `Lead`; `/ig/confirmation/` fires **`IG_BookedCall`**, never `BookedCall`. Organic IG submits therefore never enter the conversion pool the paid campaigns optimize on (campaigns optimize on `Lead`). `PageView` still fires on both, so retargeting audiences keep building. The "Booked Call" custom conversion is URL-scoped to `apply.morejobcalls.com/confirmation` — `/ig/confirmation/` does not match that string, so paid reporting stays clean too.
- **Attribution.** Organic IG carries no UTMs, so both flows stamp `utm_source=instagram` / `utm_medium=organic` / `utm_campaign=ig-bio` — **blanks only**: a real `?utm_source=` on the URL or a stored first-touch value always wins, and `fbclid`/`gclid` are never touched. GHL payloads also carry `channel: 'ig-organic'` (inert until the inbound-webhook sample is re-captured on the "1. New Lead" workflow; `utm_source` is the field that maps today).
- **Post-booking routing.** The two GHL calendars are shared with root and their redirects are configured server-side (`/confirmation/`, `/scheduled/`), so `/ig/` listens for `msgsndr-booking-complete` and navigates to its own twins itself — keyed on `calendarId` (`6Ck4IfG5SatgIkAZJ7yo` = ICP). Our listener is registered after `form_embed.js`, so ours is the last navigation queued and wins. **Worst case (GHL wins the race): the lead lands on the normal root confirmation page — still fully functional, only that one booking's `IG_BookedCall` isolation is lost.** Durable fix = duplicate both GHL calendars with `/ig/` redirect URLs.
- **SEO.** `noindex, nofollow` + `canonical → /` so the clone never competes with the root LP or reads as duplicate content (root stays `index, follow`).
- **Repoint to PAID IG later:** swap the two `IG_Lead` `trackCustom` calls back to `fbq('track','Lead',…)` and `IG_BookedCall` → `BookedCall`. Both spots are commented in-file.

**Verified locally (headless Chrome, GHL webhook + funnel-events hard-blocked so no test lead was created):** LP and confirmation render at identical scroll height (7219px / 2911px), identical section + image counts, zero JS errors, zero broken images. Full application walked end-to-end on `/ig/` → fired `IG_Lead` **and no standard `Lead`**; ICP answer loaded the correct green ICP calendar prefilled; GHL payload showed `icp=yes · channel=ig-organic · utm_source=instagram · utm_medium=organic · utm_campaign=ig-bio`. Root re-tested in the same run → still fires standard `Lead`, unchanged.

**Known open items:** (1) the GHL "1. New Lead" workflow still fires the **server-side CAPI `Lead`** for IG leads — browser-side isolation alone doesn't stop it; needs an if/else on the workflow (skip the Meta CAPI webhook when `channel = ig-organic`) to be airtight. (2) Confirm in Events Manager that the "Booked Call" custom conversion rule is domain-scoped, not a bare `/confirmation` contains-match.
