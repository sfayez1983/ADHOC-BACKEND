# Arcade Expressions Consolidation Summary

## Overview
All JavaScript/Arcade expressions have been consolidated from individual files into organized, outlet-type-specific files. This makes it easier to manage, maintain, and debug expressions for each outlet type in ArcGIS Online.

---

## File Structure

### 1. **Global_Expressions.js**
Contains expressions used by **all outlet types** or expressions without outlet-specific conditions.

**Includes:**
- `total_facings` - Total facings calculation
- `Comp_total_faces` - Competitor facings
- `rb_total_faces` - Red Bull total facings
- `rb_faces_pct` - Percentage of RB faces vs total
- `Redbull_Availability` - RB availability score (0-100%)
- `rb_availability_compliance` - Availability compliance check
- `totalkpis` - Returns KPI count based on outlet type (5/6/4/7)
- `compliant` - Counts met KPIs per outlet
- `compliance` - Compliance percentage
- `sos_compliance` - Share of Shelf compliance
- `sos_incentive` - SOS incentive calculation
- `No_Of_Facing_Score` - Facing score check
- `totalincentive` - Sum of all incentives
- `strike_zone_comp` - Strike Zone compliance (all outlets except Bazar)
- `strike_zone_incentive` - Strike Zone incentive (Gas Station specific reward)
- `price_comm` - Price Communication compliance (all outlets)
- `price_comm_incentive` - Price Comm incentive (Gas Station specific reward)

---

### 2. **Supermarket_Consolidated.js**
Expressions **specific to Supermarket** outlet type.

**Includes:**
- `rb_cooler_cashier_compliance` - Cooler placement at cashier (requires: cashier_fridge_rb + strike_zone + availability + price_comm)
- `rb_cooler_cashier_incentive` - Incentive value: 5 points
- `ambient_place_compliance` - Ambient placement compliance (requires: additional_ambient_placement + all other compliance checks)
- `ambient_incentive` - Incentive value: 5 points
- `No_Of_Facing_Score_Supermarket` - Score based on faces% (≥70%) and shelf count (2 or ≥3)

**Score Returns:**
- 10 points: 70%+ faces & 2 shelves
- 22 points: 70%+ faces & 3+ shelves

---

### 3. **Impulse_Grocery_Consolidated.js**
Expressions **specific to Impulse & Grocery** outlet type.

**Includes:**
- `rb_largecooler_compliance` - Large cooler placement check
- `rb_largecooler_incentive` - Incentive value: 10 points
- `No_Of_Facing_Score_Impulse_Grocery` - Score based on cooler present + shelf count

**Score Returns:**
- 10 points: 1 shelf
- 25 points: 2 shelves
- 32 points: 3+ shelves

---

### 4. **Bazar_Consolidated.js**
Expressions **specific to Bazar** outlet type.

**Includes:**
- `rb_cooler_research_compliance` - Cooler placement check
- `rb_cooler_research_incentive` - Incentive: 10 points (requires: cooler compliance + price_comm + availability)
- `Outdoor_Visibility_Compliance_SSL_LCS` - Shop Sign Lightbox or Illuminated Can Sign check
- `Outdoor_Visibility_incentive_SSL_LCS` - Incentive value: 5 points

---

### 5. **Gas_Station_Consolidated.js**
Expressions **specific to Gas Station** outlet type.

**Includes:**
- `sticky_shelf_place_compliance` - Sticky shelf placement (count ≥ 1)
- `sticky_shelf_incentive` - Incentive: 1 point (1 shelf) or 2 points (2+ shelves)
- `cashier_place_compliance` - Cooler at cashier placement
- `cashier_place_incentive` - Incentive value: 3 points
- `outdoor_vis_compliance` - Outdoor visibility materials
- `outdoor_vis_incentive` - Incentive value: 1 point
- `rb_availability_incentive` - Incentive value: 3 points (if availability compliance = 1)
- `No_Of_Facing_Score_Gas_Station` - Score based on faces percentage (requires 2+ shelves)

**Score Returns:**
- 7 points: 80%+ faces
- 5 points: 70-79% faces
- 1.5 points: 60-69% faces

---

## Key Points

✅ **All outlet types use lowercase comparison**: `Lower(Trim(DefaultValue($feature.VIP_Contract, "")))`

✅ **All expressions maintain consistent structure**: Status + Project + Outlet checks first

✅ **Global expressions apply to all outlets** unless otherwise specified

✅ **Outlet-specific files include validation** for their outlet type

✅ **Compliance checks are dependencies** - used by scoring and incentive calculations

---

## Usage in ArcGIS Online

Each expression in these files should be placed in its corresponding **Label field** in ArcGIS Online forms:

1. Copy the expression code (between the comment headers)
2. Paste into the field's Arcade expression editor
3. Save the field configuration

**Example:**
- If you need `rb_cooler_cashier_compliance` for Supermarket, go to **Supermarket_Consolidated.js**
- Copy the code between `//rb_cooler_cashier_compliance` and the next `// ====` line
- Paste into the `rb_cooler_cashier_compliance` field's Arcade expression editor

---

## Dependencies

Each expression lists its dependencies in comments:

```
//rb_cooler_cashier_compliance
// Requirements: cashier_fridge_rb + strike_zone_comp + rb_availability_compliance + rb_price_comm_main
```

Make sure all required fields exist in your feature layer with correct field names (case-sensitive in actual calculations).

---

## Notes

- All date/field comparisons use **lowercase** for consistency
- Arabic status check: `status != "زيارة ناجحة"` (Successful Visit)
- All project checks: `project != "vip"`
- All expressions return **0 or numeric values** (no string returns)
- Global expressions may be referenced by outlet-specific expressions

---

**Last Updated:** 2026-09-21
**Consolidation Type:** Option A (separate files per outlet type)
