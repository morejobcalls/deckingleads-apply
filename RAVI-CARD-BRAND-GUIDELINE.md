# Ravi-Style Case-Study Card System — Brand Guideline (MJC-adapted)

**Source of truth:** scaling-with-systems-vsl.netlify.app (the page behind scalingwsystems.com/dfyf-free-training-vsl-1), dissected 2026-07-17 via DOM computed styles — values below are measured, not eyeballed.
**Applies to:** apply.morejobcalls.com proof section (primary), morejobcalls.com/wins.html (same system), any future proof surface.

---

## 1. What makes Ravi's proof wall work (the principles)

1. **Person-first, not thumbnail-first.** Every card leads with a human face + name + niche. The video is one click deeper, never the hero.
2. **Dark cards on a light page.** Near-black cards (#1A1917) on white/cream make the wall read as a dense "wall of receipts" while the rest of the page stays airy.
3. **One accent per card, rotating.** Each card gets ONE vibrant hue used in exactly two places: the 3px top border + the headline stat. Everything else is constant. The rotation makes 30 cards feel individually real instead of templated.
4. **The niche label is ALWAYS antique gold** — it does not rotate. Gold = the brand thread; accents = the variety.
5. **Stat formats vary on purpose.** Totals ($11.7M) · before→after ($7K → $55K/Mo) · multipliers (3× → 5.6× ROAS) · percentages (39%) · unit economics ($200/Qualified Call) · counts (33 Calls) · time-boxed ($35K in 5 Days). The variety signals "real ledger," not a copywriter's template.
6. **Context line disciplines the stat.** Directly under the big number: `METRIC · QUALIFIER` in 50% white ("Monthly Revenue · 84% Margins"). It's the fine print that makes the big number credible.
7. **Body = 2–3 sentence mini-story with MORE numbers**, ending in a "Full case study →" link (muted gold). Cards never feel like ads; they feel like entries in a log.
8. **CTAs are sandwiched INSIDE the wall** — every ~2 rows of cards, a gold "Book a Free Call" button + one-line guarantee microcopy. The proof does the selling; the CTA just catches it.
9. **Scroll animation:** sections fade/rise in on scroll (subtle, ~300ms). Optional.

## 2. Measured tokens (Ravi exact)

| Token | Value |
|---|---|
| Page bg | #FFFFFF (page), cards pop dark |
| Card bg | `#1A1917` (alt deeper: #211F1C) |
| Card radius | 14px |
| Card padding | 24px 20px |
| Card top border | 3px solid [accent] |
| Avatar | 44px circle, 2px ring `rgba(201,168,76,.3)` (translucent gold) |
| Name | 15px / 700 / `#F8F7F3` |
| Niche label | 12px / 400 / `#C9A84C` (antique gold — constant) |
| Headline stat | 24px / 800 / [accent] |
| Context line | 12.8px / `rgba(248,247,243,.5)` · separators " · " |
| Body | 13px / `rgba(248,247,243,.65)` |
| Link | "Full case study →" muted gold, small |
| Font | DM Sans throughout (Ravi). **MJC: keep LP font stack.** |
| Section H2 | 44px / 800 / near-black |
| Eyebrow | tiny uppercase gold letterspaced |

**Accent rotation (measured):** sky `#0EA5E9` · orange `#F97316` · indigo `#818CF8` · emerald `#10B981` · pink `#F472B6` · cyan `#22D3EE` · lime `#A3E635` · purple `#A855F7` · amber `#EAB308` · red/rose `#F43F5E`. Assign in order, never two identical hues adjacent (row-wise).

## 3. MJC adaptation rules

- **Keep MJC gold `#C7963F`** for the niche label + card links (it's within a hair of Ravi's #C9A84C — the brand thread ports 1:1).
- **Keep the LP's existing font stack** — structure and color system are Ravi's; the typeface stays MJC.
- **Cards are dark (#1A1917) on the LP's cream (#FBFAF7)** — mirrors Ravi's dark-on-light contrast exactly.
- **Avatars are REAL client photos** (from case-study video frames/thumbnails), 44–56px circles with the translucent gold ring. Initials only as a fallback when no photo exists.
- **Stat content:** vary formats per §1.5 using each client's verified numbers. Never invent a format the numbers don't support.
- **Context line:** metric + qualifier, e.g. `Signed Contracts · 17 Days`, `Cost Per Lead · 14 Days`, `Monthly Revenue · Biggest in 15 Years`.
- **Body:** 2–3 sentences, verbatim-derived numbers only (Master Testimonial Library / publish packages are the source). End with `Watch the call →` (links to YouTube) — our equivalent of "Full case study →"; where a /learn/ page exists, link there instead (stronger: keeps them in the funnel's world).
- **CTA sandwich:** after every 2 rows, repeat the LP's gold CTA + guarantee microline (LP already has these components).
- **Compliance:** stats must match the published video/page claims verbatim; guarantee wording only from the Master Offer Doc.

## 4. Card anatomy (MJC markup skeleton)

```html
<article class="rv-card" style="--accent:#0EA5E9">
  <div class="rv-head">
    <img class="rv-avatar" src="/proof-faces/billy-stewart.jpg" alt="Billy Stewart">
    <div>
      <p class="rv-name">Billy Stewart</p>
      <p class="rv-niche">Trinity Decks · Deck Builder</p>
    </div>
  </div>
  <p class="rv-stat">$1,657 → $300K+</p>
  <p class="rv-context">Signed Contracts · 17 Days</p>
  <p class="rv-body">$196,383 in his first week. Closing 80-something percent and booked out 14–16 weeks. He'd spent $250K on leads before this.</p>
  <a class="rv-link" href="…">Watch the call →</a>
</article>
```

## 5. Where deployed

- `apply.morejobcalls.com` `#proof` — v3 Ravi-exact cards (this guideline's first application)
- `morejobcalls.com/wins.html` — port after funnel approval
- Client face assets: `/proof-faces/` in the funnel repo (sourced from video thumbnails/frames; crop log in `proof-faces/SOURCES.md`)
