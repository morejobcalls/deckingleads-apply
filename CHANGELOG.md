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
