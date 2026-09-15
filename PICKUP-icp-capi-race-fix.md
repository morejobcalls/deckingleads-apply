---
client: "SPG (internal)"
project: "ICP-pixel signal recovery + v9 survey (website/ZIP) + Meta account triage"
status: "Active"
percent_complete: 80
last_touched: "2026-09-15"
current_blocker: "Two of five newly-launched Meta ad sets have DISAPPROVED ads, stranding $50/day of a $150/day budget; policy reason only visible in Ads Manager UI."
next_action: "Open the two disapproved ads in Ads Manager, paste the copy to Claude to check against the Take A/Take B guarantee rule, then rebuild them (a rejected ad cannot be re-enabled)."
owner: "Spencer"
summary_oneline: "Found and fixed a workflow race that silently stripped ICP leads of their Meta Lead AND Schedule events, rebuilt the v9 survey to capture business website + service-area ZIP, remapped everything into GHL and the Master Tracker, then triaged the live Meta account."
---

# ICP CAPI race fix + v9 survey + Meta triage — 2026-09-15

## The root cause (finally)

`1. New Lead` fires **QualifiedLead** (step 15) only AFTER a `Wait 1 min` (step 10). `2. Booked | CHUNG V1` step 0 removes the contact from **all other workflows** the moment they book. v9 renders the ICP slot picker in place right after submit, so ICP leads book inside that minute — step 15 never ran, and **the ICP pixel never saw them**.

Same race also killed the **Schedule** event: `2. Booked` step 4 gated its ICP branch on the `icp-qualified` TAG (also written after the wait), and `Meta CAPI — Schedule → ICP pixel` lives inside that branch.

**Not Zach McFarland's bug.** He submitted 9/08, booked 9/10 — never hit the race. His Lead fired (ICP pixel shows `Lead ×4` in his 22:00Z submit hour) and simply wasn't *attributed*. Claude initially claimed otherwise and corrected it. As of 9/15 the race had cost **zero** ICP pixel events in the backfillable window; v9's in-place picker was about to start eating them.

## DONE this session

**LP repo** (pushed to `main`): `727a634` test mode → ICP-only routing · `3f7f6d4` non-ICP booking widget prefill · `c1c01e3` `/v4/ /v5/ /v6/` retired to redirects · `4fadb56` survey: business website replaces business name + service-area ZIP (5 steps, calendar step 6) · `a0c14b2` CHANGELOG.

**Relay `meta-capi-relay`** (source `capi-worker/worker.v5-tiered-events.js`, backup `…PRE-ICP-MIRROR-2026-09-15.js.bak`, deployed via CF API with `keep_bindings:["secret_text"]`):
- mirrors a plain `Lead` to the ICP pixel when `icp === 'yes'` (**strict** — missing `icp` must never mirror), so the ICP Lead fires at step 8, before the wait
- new **`test_event_code_icp`** so the dual-pixel path is testable without a foreign code landing on the other pixel

**GHL** — `1. New Lead` **v100 → v106**: step 8 sends `icp`; Create Contact gained Business Website + LP Version/Variant/Page URL/In-App Browser, dropped two dead v8 mappings (**30** fields); Leads sheet step **20** columns. `2. Booked | CHUNG V1` **v5 → v8**: ICP gate = `tag OR ICP-Qualified-(Survey) field`, Non-ICP = `no tag AND field != yes`; Booked Calls sheet step **11** columns.

**Master Tracker** `1aUUh8xKjAhy22JKA-wD95O6xUKBeX-_b-X2Wtn7wiN4`: Leads `R/S/T` = Business Website, Appts Now/Week, More Appts/Week · Booked Calls `J/K` = Business Website, Zip.

**`mjc-journey` worker**: now unwraps GHL's `customData` wrapper so a workflow step can post to it directly.

**Backfill: audited, fired nothing.** 204 LP contacts; 8 inside Meta's 7-day `event_time` limit; exactly one (Zach) is ICP and his event already fired. Everyone else `icp = no` — firing would have fabricated conversions.

## Key IDs / facts a future session needs

- Workflows: `1. New Lead` **1677a66a-4194-4def-a4a1-d7552f01aa4b** · `2. Booked | CHUNG V1` **b4cafe51-59a0-41e3-aab1-932ef8217437** · location **X6hS5G8dcD7NqDBOVDNP**
- Pixels: ICP **1832632181230934** · seasoned **839107878270720**. Ad account **act_817513866974232**.
- **ICP marker = `ICP Qualified (Survey)` `Cipe4aWqmIbTlYu1Vjy6`** (set at contact creation, race-proof). `contact.revenue` is EMPTY on LP contacts — survey value lives in `Annual Revenue (Survey)` `vUA1sK5h99yigAGc6GaW`.
- Business Website (Survey) = `eNrSFGteNfZWTzCNLFSb`. Original Meta event_id is stored per contact on `Meta CAPI Event ID (Survey)` `YnS0kZricD763Mu56QwL`.
- `capi-lead-fired` proves step 8 RAN, never that Meta accepted it (step 9 tags unconditionally).
- `/{pixel}/stats` **counts test events** — never use it to judge a leak. Use the Test Events feed (proves test) or Ads Manager attribution (proves real).
- Gotchas hit: GHL API needs **curl**, not python-urllib (Cloudflare 1010) · a GHL workflow with no contact step never executes · GHL nests webhook-step payloads under `customData` · the Events Manager feed goes stale and needs a reload + channel re-select.
- Scripts (session scratchpad, copy out if needed): `icp_backfill_audit.py`, `fix_new_lead_icp_flag.py`, `map_business_website_field.py`, `map_remaining_survey_fields.py`, `unmap_dead_survey_fields.py`, `update_tracker_sheet_steps.py`, `fix_booked_icp_gate.py`, `test_relay_routing.mjs`. Workflow backups: `capi-worker/workflow-backups/2026-09-15/`.

## NEXT STEPS

1. **[Spencer] Rebuild the two disapproved ads** — `3Crews + Ad 1` and `Billy Supercut + Ad 3`. Their ad sets are ACTIVE at $25/day but can never deliver, stranding **$50/day of $150/day**. The API won't return the policy reason; open them in Ads Manager. Suspect the cash-figure guarantee wording (Meta ads must use **Take B** fee-back, never "$10,000"). A rejected ad can't be re-enabled — it must be recreated. Paste the copy and Claude will check it against the offer doc rule.
2. **[Spencer] Decide the optimization event.** Five of six live ad sets optimize on **LEAD against the ICP pixel**, which fires ~3–5×/month against Meta's 50/ad set/week learning threshold — the algorithm is effectively blind. Alternative: optimize on the seasoned pixel's Lead (~30/mo) and let the survey filter downstream. Tension with the deliberate 8/22 tiered-ICP design, so it's Spencer's call. **This is the highest-leverage Meta decision.**
3. **[Claude, on request] Do NOT consolidate ad sets yet** — the five P2 sets launched 9/15 as a creative test. Revisit once they read. Claude's earlier "16 ad sets, kill 7, save $637/mo" was based on 30-day *historical* spend (most already paused) and was retracted.
4. **[Claude] Package 1b copy** — neutral SMS rail, 10-min phone/video split, 3 Viral-Coach-style pre-call emails inside `2. Booked`, retire `2e`, iMessage ZIP fixes, NO-branch body-text matching. Two open decisions: keep the "we'll release your slot" line? unpublish `2e. Booked | Welcome Proof Email`?
5. **[Claude] Optional cleanup** — fast bookers still never get `icp-qualified`/`icp-unqualified` (step 14 is after the wait) and step 15's *seasoned* QualifiedLead never fires for them. Nothing consumes the tag any more (all 29 published workflows scanned; the booked gate is now field-backed). Use the **field** for ICP reporting. Low value; would need the ICP branch moved ahead of the wait on a 90-node workflow.
6. **[Claude] Drop the `business_name` alias** from the LP once the dedicated Business Website field has proven itself, so GHL Company Name stops filling with URLs.

## Context worth carrying

Live Meta reality as of 9/15: **6 active ad sets** (5 launched today), $25/day each. Last 14d actual spend **$248** — only `I'm Lying OG` delivering (3 leads, $83 CPL). 30-day account: $3,050, 30 leads, $102 CPL, but only ~3 were ICP → **~$1,017 per ICP lead**, a ~10% ICP rate. 5 appointments in 30 days. The constraint is top-of-funnel volume and lead *quality*, not tracking — tracking is now correct, which makes it measurable but doesn't create leads.

Another session shipped **Journey Ledger Phase 1** (`8b19864`) and root hero edits the same day; the journey root include no longer needs re-porting.
