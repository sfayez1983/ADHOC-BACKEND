# New Calc — Consolidation Summary

All **43 expressions** from the 14 source files are now in a single file:
**`Global_Expressions.js`**, organized into 14 sections in dependency order.

No per-outlet files were created — every expression keeps its own `VIP_Contract`
check inside, so one file covers all four types:
`supermarket` · `impulse & grocery` · `bazar` · `gas station`

---

## Section map

| # | Section | Applies to | Expressions |
|---|---------|-----------|-------------|
| 1 | Availability | all | `Redbull_Availability`, `SKU_Avail_Sc`, `rb_availability_compliance`, `rb_availability_incentive` |
| 2 | Facings | all | `rb_total_faces`, `Comp_total_faces`, `total_facings`, `rb_faces_pct` |
| 3 | Share of Shelf | SM · IG · GS | `Shelf_Facings_Check`, `sos_compliance`, `sos_comp_per`, `sos_incentive` |
| 4 | Strike Zone | all except Bazar | `strike_zone_comp`, `strike_zone_sc`, `strike_zone_incentive` |
| 5 | Price Communication | all | `price_comm`, `price_comm_comp_sc`, `price_comm_incentive` |
| 6 | Outdoor / Brand Visibility | Gas Station | `outdoor_vis_compliance`, `brand_vis_comp_Sc`, `outdoor_vis_incentive` |
| 7 | Shop Sign / Illuminated Can | Bazar | `Outdoor_Visibility_Compliance_SSL_LCS`, `Outdoor_Comp_Sc`, `Outdoor_Visibility_incentive_SSL_LCS` |
| 8 | Sticky Shelf | Gas Station | `sticky_shelf_place_compliance`, `Sticky_Shelf_comp_sc`, `sticky_shelf_incentive` |
| 9 | Ambient Placement | Supermarket | `ambient_place_compliance`, `Ambient_Place_Comp_Sc`, `ambient_incentive` |
| 10 | Cashier Fridge | Supermarket | `rb_cooler_cashier_compliance`, `RB_Cashier_Cooler_Sup_Comp_Sc`, `rb_cooler_cashier_incentive` |
| 11 | Large Cooler | Impulse & Grocery | `rb_largecooler_compliance`, `RB_Lg_Cooler_IG_Comp_Sc` |
| 12 | Cooler Research | Bazar | `rb_cooler_research_compliance`, `RB_Cooler_Research_Ba_Comp_Sc`, `rb_cooler_research_incentive` |
| 13 | Cashier Cooler Placement | Gas Station | `cashier_place_compliance`, `Cashier_Place_GAS_Comp_Sc`, `cashier_place_incentive` |
| 14 | Totals | all | `TOTAL_SCORE`, `compliance`, `totalincentive` |

---

## Calculation order

Fields must be calculated in this order, because later ones read earlier ones:

```
1. Redbull_Availability  →  SKU_Avail_Sc  →  rb_availability_compliance
2. rb_total_faces + Comp_total_faces  →  rb_faces_pct  →  Shelf_Facings_Check
3. All *_compliance fields
4. All *_Sc / *_sc score fields
5. TOTAL_SCORE
6. sos_incentive        (needs TOTAL_SCORE)
7. All other *_incentive fields
8. compliance
9. totalincentive       (needs compliance)
```

`sos_incentive` is the only incentive that depends on `TOTAL_SCORE`, so it must
run after step 5 — not alongside the other incentives.

---

## Score model — every outlet totals 100

`TOTAL_SCORE` sums the `*_Sc` fields. Each outlet only ever populates its own
components, and each set adds up to exactly 100:

| Component | SM | IG | Bazar | GS |
|---|---:|---:|---:|---:|
| `SKU_Avail_Sc` | 20 | 20 | 20 | 20 |
| `sos_compliance` | 50 | 50 | — | 50 |
| `strike_zone_sc` | 5 | 5 | — | 5 |
| `price_comm_comp_sc` | 5 | 5 | 10 | 5 |
| `brand_vis_comp_Sc` | — | — | — | 5 |
| `Outdoor_Comp_Sc` | — | — | 20 | — |
| `Sticky_Shelf_comp_sc` | — | — | — | 5 |
| `Ambient_Place_Comp_Sc` | 5 | — | — | — |
| `RB_Cashier_Cooler_Sup_Comp_Sc` | 15 | — | — | — |
| `RB_Lg_Cooler_IG_Comp_Sc` | — | 20 | — | — |
| `RB_Cooler_Research_Ba_Comp_Sc` | — | — | 50 | — |
| `Cashier_Place_GAS_Comp_Sc` | — | — | — | 10 |
| **Total** | **100** | **100** | **100** | **100** |

Note `sos_compliance` returns the score value **50** (not a 0/1 flag) so it can be
summed directly. `sos_comp_per` is the 0/1 version used by `compliance`.

---

## KPI counts used by `compliance`

| Outlet | KPIs | Fields counted |
|---|---:|---|
| Impulse & Grocery | 5 | avail, strike, large cooler, sos, pricing |
| Supermarket | 6 | avail, strike, pricing, sos, ambient, cashier cooler |
| Bazar | 4 | avail, pricing, cooler research, shop sign |
| Gas Station | 7 | avail, sos, strike, pricing, outdoor, sticky, cashier cooler |

`compliance` returns a **ratio 0–1** (rounded to 3), and `totalincentive` pays
**0 unless `compliance >= 0.8`**.

---

## What changed vs. the previous folder

- `Redbull_Availability` now returns a **ratio 0–1** (`/6`, rounded 3) instead of a percentage.
- `rb_faces_pct` is now a **ratio 0–1**, so all thresholds are `0.7` / `0.8` / `0.6` instead of `70` / `80` / `60`.
- `rb_availability_compliance` is now driven by `SKU_Avail_Sc == 20` instead of `Redbull_Availability == 100`.
- New scoring layer: every compliance field has a matching `*_Sc` score field, rolled up by `TOTAL_SCORE`.
- `Shelf_Facings_Check` (`rb_total_faces / 8`, floored) replaces direct use of `rb_complete_shelves_cnt` in `sos_incentive`.
- `sos_incentive` now gates on `TOTAL_SCORE > 80` instead of checking strike zone and price communication separately.
- `strike_zone_comp` now uses `outlet != "bazar"` instead of an explicit allow-list.
- `price_comm` no longer checks the outlet at all — the outlet weighting moved into `price_comm_comp_sc`.
- Bazar shop sign now reads one text field `rb_brand_visibility == "yes"` instead of the two numeric fields `Shop_Sign_Lightbox` / `ILLUMINATED_CAN_SIGN`.
- `rb_cooler_research_incentive` no longer requires price communication and availability — it only needs its own compliance.
- `rb_cooler_cashier_compliance` and `ambient_place_compliance` no longer require strike zone / availability / price communication.
- `compliance` returns a ratio instead of a raw KPI count, and the old `totalkpis` / `compliant` fields are gone.
- `totalincentive` is now gated at 80% compliance.

---

## Open items to check

1. **`rb_largecooler_incentive` has no expression.** It is still summed inside
   `totalincentive`, so Impulse & Grocery currently earns nothing for its large
   cooler. Source file notes it was *"not found in redbull excel sheet"* — confirm
   whether it should exist or be removed from `totalincentive`.

2. **`sos_incentive` has no final `return 0`.** If `VIP_Contract` is blank or an
   unexpected value, the expression falls off the end and returns `null` rather
   than `0`. Adding `return 0;` at the bottom would make it safe. I left the logic
   exactly as written — say the word and I'll add it.

3. **`sos_incentive` indirectly requires SOS to pass.** It needs `TOTAL_SCORE > 80`,
   and `sos_compliance` is worth 50 of the 100. Without it, Supermarket caps at 50
   and Impulse & Grocery at 50 — so the incentive can never trigger. Confirm that
   is intended.

4. **Planned renames** from `update_fields.md` are not applied yet:
   `outdoor_vis_compliance → brand_vis_comp` and `outdoor_vis_incentive → brand_vis_incentive`.
   If you rename them, also update `brand_vis_comp_Sc` and `totalincentive`, which
   read the old names.

5. **`sticky_shelf_avail`** is flagged in `update_fields.md` but no expression uses
   it. Let me know what it should feed.

6. **`compliance` reads `$feature.vip_contract`** while every other expression uses
   `$feature.VIP_Contract`. Arcade field names are case-insensitive so it works,
   but worth making consistent.

---

## Cleanups applied (behavior unchanged)

- Removed a duplicate `var status = ...` line in `sos_compliance` (it was declared
  twice in a row, the first immediately overwritten).
- Removed a duplicate `var avail = ...` line in `compliance` (same situation).
- Dropped the unnamed trailing block at the end of `3.sos.js` — it duplicated
  `sos_compliance` but returned `1` instead of `50`, which is exactly what
  `sos_comp_per` already does.

---

**Source:** 14 files (`1.Redbull_Availability.js` … `13.cashier_cooler_placement.js`, `total_kpi.js`)
**Output:** `Global_Expressions.js` — 43 expressions, 14 sections
**Date:** 2026-10-01
