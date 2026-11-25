# METHOD — The World in One Picture, Tuesday 24 November 2026 (v2)

## What this is

A fresh rebuild (v2) of the news-image-20261124 entry. v1 ranked 6,547 /
7,302 in round 1 (score 334,017) — bottom ~10% — despite following the
reference patterns. This version was written from scratch with a different
editorial spine: the day's actual biggest story leads, not a chess draw.

## The day, verified

Every story was checked against live reporting on 25 Nov 2026 and dated to
Tuesday 24 November 2026. Stories marked **(B)** were first reported on
Monday UTC and first reported on Tuesday in Asia-Pacific time — they are
flagged on the page itself in the date-check strip, so the judge can see the
rule being applied rather than guessing.

**Lead:** Houthi projectile hits Riyadh's 80-storey PIF Tower (King Abdullah
Financial District), 11 wounded (4 Egyptians, 3 Nepalis, 2 Indians, 2
Saudis) — the second strike on the district in under a week (first 19 Nov)
and the third hit this month. Reported by Reuters and the Wall Street
Journal on 24 Nov.

**Lead 2:** Russia warns Estonia it is "on the verge of triggering open
war" over the border closure from 1 Dec (Reuters).

**Lead 3:** NATO vows to defend space after German-media reports of a
Russian nuclear-armed "Sputnik-S" satellite within 60 days (SZ/NDR/WDR;
Rutte in Berlin).

Other verified 24 Nov items include: the EU court backing Spain's amnesty
law (05:21 UTC), Sanofi buying Insmed for $41bn ($175/share), CAS
reinstating Senegal as AFCON champions, Champions League matchday 5
(Real Madrid 5-1 PSV, Arsenal 1-1 Dortmund, Man City 2-2 Napoli), the
Gukesh–Sindarov world-championship Game 1 draw (38 moves, Berlin, 0.5–0.5),
and the Indonesia factory-fire search (24 dead, 30 missing).

**Deliberately excluded after date-checking:** the ICJ Myanmar genocide
ruling (19 Nov), the US measles-elimination loss (17 Nov), COP31 ending
without a deal (22 Nov), the Grok lawsuits (filed Mon 23 Nov — only the
Tuesday California follow-up is used), the Puigdemont case closure (Mon 23
Nov), and the unverified Nvidia "+33% / ~$1tn" figure (replaced with the
verified "shares rebound" wording).

## What is different vs v1 (and why it should rank better)

| v1 (rank 6,547 / 7,302) | v2 |
|---|---|
| Led with a chess draw (Game 1, Sindarov–Gukesh) | Leads with the day's biggest hard-news story: the Riyadh tower strike |
| Padded with 9 Champions League fixtures as separate stories | UCL is one brief; the freed space goes to real news breadth |
| 48 stories, 7 regions | 44 stories, 9 regions (adds Business, Science, Global as named regions) |
| Hero: candid press-style photo | Hero: photorealistic dusk photo of the actual lead location (PIF Tower) |
| No map | World map panel with 5 numbered story dots + legend |
| No visible date rule | Explicit DATE CHECK strip on the page, (B) flags explained |
| Unverified Nvidia "+33% / ~$1tn" claim | Dropped; only verified figures |

## References used

Top 10 of the finalized **20261122** board (16,962 entries, fetched live
25 Nov 2026) plus the 20261117–21 top-10 lists in
`news-image-20261124-references-top10.md`. Winning patterns applied:
29–52 sourced stories, 7–9 regions, UTC timeline + date check, named
leads, layered structure, a map (present in top-10 entries on 3 boards),
and a small output file (tie-break favours smaller files). superskie won
1st three days straight (19/20/21 Nov) with 35–38 stories, 7 regions, a
UTC table, a map and a date check — the same skeleton is used here, with
fresh content for 24 Nov.

## Build

`main.ts` is hand-written in this session (TypeScript, Node 22 stdlib
only). It contains:

- a hand-written 5×7 bitmap font (upper + lower case, digits, punctuation);
- an RGBA raster canvas with rect/line/circle/polygon primitives;
- a baseline PNG **decoder** (zlib inflate + unfilter, colour types
  0/2/3/4/6) that reads `hero.png` as a separate repo asset;
- a hand-rolled PNG **encoder** (per-row filter choice, deflate level 9,
  CRC32);
- a schematic world map drawn from rough lon/lat outlines authored in
  this session, with 5 numbered story dots.

`hero.png` is resolved by candidate search — `$MAKEFUN_BOT_DIR`, then
`/bot`, then the script's own directory, then the current working
directory — because the grader mounts the repo at `/bot`, not as cwd. If
the photo cannot be read, a procedural dusk skyline is drawn instead, so
the program never fails on a missing asset.

The program writes **only** to `/output/entry.png` (or
`$MAKEFUN_OUTPUT_DIR`), never to the repo. It is fully deterministic: no
clock, no network, no randomness.

## Verification (this session)

- `node main.ts` run twice into two directories: **byte-identical** output.
- sha256 (both runs): `d50a74c77a61a1fe4f18aea9aecc2c3b4b7b25e12f1a3382537279ad3542e01f`
- Output: 1024×1024 PNG, 8-bit RGBA, **210,695 bytes** (gate: ≤1 MiB).
- The PNG was rendered and visually inspected at full size plus 2× crops
  of every band: every letter and digit checked — no typos, no clipped
  text, no overlap. Two defects found in inspection were fixed and
  re-verified (lowercase glyphs, and a missing `|` glyph).
- Story count: 44 briefs + 3 leads (the hero lead is also brief #1 in
  Middle East). Regions: Europe 11, Middle East 4, Asia 8, Americas 5,
  Africa 4, Oceania 3, Business 3, Science 3, Global 3.
