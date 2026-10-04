// ================================================================================
// GLOBAL EXPRESSIONS - ALL OUTLET TYPES IN ONE FUNCTION (NEW CALC)
// VIP_Contract types: supermarket | impulse & grocery | bazar | gas station
// Same design as Global_Expressions.js, logic from the new Arcade expressions.
//
// Every feature field is read ONCE into a variable with the same name as the
// field (the "Params" block). Every expression reads only those param
// variables (same as $feature.X in Arcade) and writes its result to
// out.<field name>, so no expression uses another expression's new result.
// ================================================================================

const globalExpressions = (feature) => {

    // ============================================================
    // Helpers  (Arcade DefaultValue / Lower / Trim / Round equivalents)
    // ============================================================

    const get = (field, defaultValue = 0) => {
        const value = feature[field];

        if (value === null || value === undefined || value === "") {
            return defaultValue;
        }

        return value;
    };

    const num = (field) => {
        const n = Number(get(field, 0));
        return Number.isFinite(n) ? n : 0;
    };

    const text = (field) => {
        return String(get(field, "")).trim().toLowerCase();
    };

    const round = (value, digits = 3) => {
        const f = Math.pow(10, digits);
        return Math.round((value + Number.EPSILON) * f) / f;
    };

    // ============================================================
    // Params  (each feature field is read ONCE here;
    //          variable name = field name it reads from)
    // ============================================================

    // ---- Text fields ----
    const status = text("status");
    const project = text("project");
    const VIP_Contract = text("VIP_Contract");
    const rb_strikezone_main = text("rb_strikezone_main");
    const rb_price_comm_main = text("rb_price_comm_main");
    const outdoor_visibility_materials = text("outdoor_visibility_materials");
    const rb_brand_visibility = text("rb_brand_visibility");

    // ---- Number fields ----
    const rb_ed_250ml_shelf_avail = num("rb_ed_250ml_shelf_avail");
    const rb_sf_250ml_shelf_avail = num("rb_sf_250ml_shelf_avail");
    const rb_white_250ml_shelf_avl = num("rb_white_250ml_shelf_avl");
    const rb_purple_250ml_shelf_avl = num("rb_purple_250ml_shelf_avl");
    const rb_seablue_250ml_shelf_avl = num("rb_seablue_250ml_shelf_avl");
    const rb_zero_250ml_shelf_avail = num("rb_zero_250ml_shelf_avail");
    const Redbull_Availability = num("Redbull_Availability");
    const SKU_Avail_Sc = num("SKU_Avail_Sc");
    const rb_original_facings = num("rb_original_facings");
    const rb_sf_facings = num("rb_sf_facings");
    const rb_white_facings = num("rb_white_facings");
    const rb_purple_facings = num("rb_purple_facings");
    const rb_seablue_facings = num("rb_seablue_facings");
    const rb_zero_facing = num("rb_zero_facing");
    const rb_other_facings = num("rb_other_facings");
    const sting_facings = num("sting_facings");
    const fury_facings = num("fury_facings");
    const monster_facings = num("monster_facings");
    const other_ed_facings = num("other_ed_facings");
    const rb_total_faces = num("rb_total_faces");
    const Comp_total_faces = num("Comp_total_faces");
    const rb_complete_shelves_cnt = num("rb_complete_shelves_cnt");
    const rb_faces_pct = num("rb_faces_pct");
    const sos_compliance = num("sos_compliance");
    const rb_availability_compliance = num("rb_availability_compliance");
    const TOTAL_SCORE = num("TOTAL_SCORE");
    const Shelf_Facings_Check = num("Shelf_Facings_Check");
    const strike_zone_comp = num("strike_zone_comp");
    const price_comm = num("price_comm");
    const outdoor_vis_compliance = num("outdoor_vis_compliance");
    const Outdoor_Visibility_Compliance_SSL_LCS = num("Outdoor_Visibility_Compliance_SSL_LCS");
    const addin_sticky_shelf_cnt = num("addin_sticky_shelf_cnt");
    const sticky_shelf_place_compliance = num("sticky_shelf_place_compliance");
    const additional_ambient_placement = num("additional_ambient_placement");
    const ambient_place_compliance = num("ambient_place_compliance");
    const cashier_fridge_rb = num("cashier_fridge_rb");
    const rb_cooler_cashier_compliance = num("rb_cooler_cashier_compliance");
    const rb_largecooler_present = num("rb_largecooler_present");
    const rb_largecooler_compliance = num("rb_largecooler_compliance");
    const rb_largecooler_incentive = num("rb_largecooler_incentive");
    const rb_cooler_present = num("rb_cooler_present");
    const rb_cooler_research_compliance = num("rb_cooler_research_compliance");
    const cashier_cooler_placement = num("cashier_cooler_placement");
    const cashier_place_compliance = num("cashier_place_compliance");
    const strike_zone_sc = num("strike_zone_sc");
    const price_comm_comp_sc = num("price_comm_comp_sc");
    const brand_vis_comp_Sc = num("brand_vis_comp_Sc");
    const Outdoor_Comp_Sc = num("Outdoor_Comp_Sc");
    const Sticky_Shelf_comp_sc = num("Sticky_Shelf_comp_sc");
    const Ambient_Place_Comp_Sc = num("Ambient_Place_Comp_Sc");
    const RB_Cashier_Cooler_Sup_Comp_Sc = num("RB_Cashier_Cooler_Sup_Comp_Sc");
    const RB_Lg_Cooler_IG_Comp_Sc = num("RB_Lg_Cooler_IG_Comp_Sc");
    const RB_Cooler_Research_Ba_Comp_Sc = num("RB_Cooler_Research_Ba_Comp_Sc");
    const Cashier_Place_GAS_Comp_Sc = num("Cashier_Place_GAS_Comp_Sc");
    const sos_comp_per = num("sos_comp_per");
    const compliance = num("compliance");
    const rb_availability_incentive = num("rb_availability_incentive");
    const sos_incentive = num("sos_incentive");
    const strike_zone_incentive = num("strike_zone_incentive");
    const price_comm_incentive = num("price_comm_incentive");
    const outdoor_vis_incentive = num("outdoor_vis_incentive");
    const Outdoor_Visibility_incentive_SSL_LCS = num("Outdoor_Visibility_incentive_SSL_LCS");
    const sticky_shelf_incentive = num("sticky_shelf_incentive");
    const ambient_incentive = num("ambient_incentive");
    const rb_cooler_cashier_incentive = num("rb_cooler_cashier_incentive");
    const rb_cooler_research_incentive = num("rb_cooler_research_incentive");
    const cashier_place_incentive = num("cashier_place_incentive");

    // ============================================================
    // Visit / outlet flags  (from the params above)
    // ============================================================

    // status == "زيارة ناجحة"
    const isSuccess = status === "زيارة ناجحة";

    // status == "زيارة ناجحة" && project == "vip"
    const isVip = isSuccess && project === "vip";

    // VIP_Contract
    const isSupermarket = VIP_Contract === "supermarket";
    const isImpulse = VIP_Contract === "impulse & grocery";
    const isBazar = VIP_Contract === "bazar";
    const isGas = VIP_Contract === "gas station";

    // ============================================================
    // Output  (every calculated field is stored here under its field name)
    // ============================================================

    const out = {};

    // ============================================================ SECTION 1 - AVAILABILITY (all outlets) ============================================================

    // ============================================================
    // Redbull_Availability
    // ============================================================

    out.Redbull_Availability = 0;

    if (isVip) {
        const baseFaces =
            rb_ed_250ml_shelf_avail +
            rb_sf_250ml_shelf_avail +
            rb_white_250ml_shelf_avl +
            rb_purple_250ml_shelf_avl +
            rb_seablue_250ml_shelf_avl +
            rb_zero_250ml_shelf_avail;

        out.Redbull_Availability = baseFaces > 0 ? round(baseFaces / 6, 3) : 0;
    }

    // ============================================================
    // SKU_Avail_Sc
    // ============================================================

    out.SKU_Avail_Sc = 20 * Redbull_Availability;

    // ============================================================
    // rb_availability_compliance
    // ============================================================

    out.rb_availability_compliance = SKU_Avail_Sc === 20 ? 1 : 0;

    // ============================================================
    // rb_availability_incentive  [gas station only]
    // ============================================================

    out.rb_availability_incentive = isGas && SKU_Avail_Sc === 20 ? 3 : 0;

    // ============================================================ SECTION 2 - FACINGS (all outlets) ============================================================

    // ============================================================
    // rb_total_faces
    // ============================================================

    out.rb_total_faces = isVip
        ? rb_original_facings +
          rb_sf_facings +
          rb_white_facings +
          rb_purple_facings +
          rb_seablue_facings +
          rb_zero_facing +
          rb_other_facings
        : 0;

    // ============================================================
    // Comp_total_faces
    // ============================================================

    out.Comp_total_faces = isVip
        ? sting_facings +
          fury_facings +
          monster_facings +
          other_ed_facings
        : 0;

    // ============================================================
    // total_facings
    // ============================================================

    out.total_facings = isVip
        ? rb_total_faces +
          sting_facings +
          fury_facings +
          monster_facings +
          other_ed_facings
        : 0;

    // ============================================================
    // rb_faces_pct  [ratio 0-1, not percent]
    // ============================================================

    out.rb_faces_pct = 0;

    if (isSuccess) {
        const total = rb_total_faces + Comp_total_faces;
        out.rb_faces_pct = total > 0 ? round(rb_total_faces / total, 3) : 0;
    }

    // ============================================================ SECTION 3 - SHARE OF SHELF (SOS) ============================================================

    // ============================================================
    // Shelf_Facings_Check
    // ============================================================

    out.Shelf_Facings_Check = Math.floor(rb_total_faces / 8);

    // ============================================================
    // sos_compliance  [score value: 50 or 0]
    // ============================================================

    out.sos_compliance = 0;

    if (isVip && !isBazar) {

        // Impulse & Grocery
        if (
            isImpulse &&
            rb_complete_shelves_cnt >= 1 &&
            rb_total_faces > 7
        ) {
            out.sos_compliance = 50;
        }

        // Supermarket
        else if (
            isSupermarket &&
            rb_complete_shelves_cnt >= 2 &&
            rb_faces_pct >= 0.70
        ) {
            out.sos_compliance = 50;
        }

        // Gas Station
        else if (
            isGas &&
            rb_complete_shelves_cnt >= 2 &&
            rb_faces_pct >= 0.60
        ) {
            out.sos_compliance = 50;
        }
    }

    // ============================================================
    // sos_comp_per  [0/1 flag used by compliance]
    // ============================================================

    out.sos_comp_per = sos_compliance === 50 ? 1 : 0;

    // ============================================================
    // sos_incentive  [needs TOTAL_SCORE > 80]
    // ============================================================

    out.sos_incentive = 0;

    if (isVip && !isBazar) {

        // SUPERMARKET
        if (isSupermarket) {

            if (
                rb_availability_compliance === 1 &&
                TOTAL_SCORE > 80 &&
                rb_faces_pct >= 0.7 &&
                Shelf_Facings_Check === 2
            ) {
                out.sos_incentive = 10;
            }

            else if (
                rb_availability_compliance === 1 &&
                TOTAL_SCORE > 80 &&
                rb_faces_pct >= 0.7 &&
                Shelf_Facings_Check >= 3
            ) {
                out.sos_incentive = 22;
            }
        }

        // IMPULSE & GROCERY
        else if (isImpulse) {

            if (
                rb_availability_compliance === 1 &&
                TOTAL_SCORE > 80 &&
                Shelf_Facings_Check === 1
            ) {
                out.sos_incentive = 10;
            }

            else if (
                rb_availability_compliance === 1 &&
                TOTAL_SCORE > 80 &&
                Shelf_Facings_Check === 2
            ) {
                out.sos_incentive = 25;
            }

            else if (
                rb_availability_compliance === 1 &&
                TOTAL_SCORE > 80 &&
                Shelf_Facings_Check >= 3
            ) {
                out.sos_incentive = 32;
            }
        }

        // GAS STATION
        else if (isGas) {

            if (Shelf_Facings_Check < 2) {
                out.sos_incentive = 0;
            }

            else if (rb_faces_pct >= 0.8) {
                out.sos_incentive = 7;
            }

            else if (rb_faces_pct >= 0.7) {
                out.sos_incentive = 5;
            }

            else if (rb_faces_pct >= 0.6) {
                out.sos_incentive = 1.5;
            }
        }
    }

    // ============================================================ SECTION 4 - STRIKE ZONE (all outlets except bazar) ============================================================

    // ============================================================
    // strike_zone_comp
    // ============================================================

    out.strike_zone_comp = isVip && !isBazar && rb_strikezone_main === "yes" ? 1 : 0;

    // ============================================================
    // strike_zone_sc  [comp x 5]
    // ============================================================

    out.strike_zone_sc = strike_zone_comp * 5;

    // ============================================================
    // strike_zone_incentive  [gas station only]
    // ============================================================

    out.strike_zone_incentive = isGas && strike_zone_comp === 1 ? 2 : 0;

    // ============================================================ SECTION 5 - PRICE COMMUNICATION (all outlets) ============================================================

    // ============================================================
    // price_comm
    // ============================================================

    out.price_comm = isVip && rb_price_comm_main === "yes" ? 1 : 0;

    // ============================================================
    // price_comm_comp_sc  [bazar x10, all others x5]
    // ============================================================

    out.price_comm_comp_sc = isBazar
        ? price_comm * 10
        : price_comm * 5;

    // ============================================================
    // price_comm_incentive  [gas station only]
    // ============================================================

    out.price_comm_incentive = price_comm === 1 && isGas ? 1 : 0;

    // ============================================================ SECTION 6 - OUTDOOR / BRAND VISIBILITY (gas station only) ============================================================

    // ============================================================
    // outdoor_vis_compliance  [planned rename -> brand_vis_comp]
    // ============================================================

    out.outdoor_vis_compliance = isVip &&
        outdoor_visibility_materials === "yes" &&
        isGas
            ? 1
            : 0;

    // ============================================================
    // brand_vis_comp_Sc  [comp x 5]
    // ============================================================

    out.brand_vis_comp_Sc = outdoor_vis_compliance * 5;

    // ============================================================
    // outdoor_vis_incentive  [planned rename -> brand_vis_incentive]
    // ============================================================

    out.outdoor_vis_incentive = outdoor_vis_compliance === 1 ? 1 : 0;

    // ============================================================ SECTION 7 - SHOP SIGN / ILLUMINATED CAN SIGN (bazar only) ============================================================

    // ============================================================
    // Outdoor_Visibility_Compliance_SSL_LCS
    // ============================================================

    out.Outdoor_Visibility_Compliance_SSL_LCS = isVip && isBazar && rb_brand_visibility === "yes" ? 1 : 0;

    // ============================================================
    // Outdoor_Comp_Sc  [comp x 20]
    // ============================================================

    out.Outdoor_Comp_Sc = Outdoor_Visibility_Compliance_SSL_LCS * 20;

    // ============================================================
    // Outdoor_Visibility_incentive_SSL_LCS
    // ============================================================

    out.Outdoor_Visibility_incentive_SSL_LCS = Outdoor_Visibility_Compliance_SSL_LCS === 1 ? 5 : 0;

    // ============================================================ SECTION 8 - STICKY SHELF (gas station only) ============================================================

    // ============================================================
    // sticky_shelf_place_compliance  (status check only, as in Arcade)
    // ============================================================

    out.sticky_shelf_place_compliance = isSuccess && isGas && addin_sticky_shelf_cnt >= 1 ? 1 : 0;

    // ============================================================
    // Sticky_Shelf_comp_sc  [comp x 5]
    // ============================================================

    out.Sticky_Shelf_comp_sc = sticky_shelf_place_compliance * 5;

    // ============================================================
    // sticky_shelf_incentive  [1 shelf = 1, 2+ shelves = 2]
    // ============================================================

    out.sticky_shelf_incentive = 0;

    if (sticky_shelf_place_compliance === 1 && isGas) {
        if (addin_sticky_shelf_cnt >= 2) {
            out.sticky_shelf_incentive = 2;
        } else if (addin_sticky_shelf_cnt === 1) {
            out.sticky_shelf_incentive = 1;
        }
    }

    // ============================================================ SECTION 9 - ADDITIONAL AMBIENT PLACEMENT (supermarket only) ============================================================

    // ============================================================
    // ambient_place_compliance
    // ============================================================

    out.ambient_place_compliance = isVip && additional_ambient_placement === 1 && isSupermarket ? 1 : 0;

    // ============================================================
    // Ambient_Place_Comp_Sc  [comp x 5]
    // ============================================================

    out.Ambient_Place_Comp_Sc = ambient_place_compliance * 5;

    // ============================================================
    // ambient_incentive
    // ============================================================

    out.ambient_incentive = ambient_place_compliance === 1 ? 5 : 0;

    // ============================================================ SECTION 10 - CASHIER COOLER / FRIDGE (supermarket only) ============================================================

    // ============================================================
    // rb_cooler_cashier_compliance
    // ============================================================

    out.rb_cooler_cashier_compliance = isVip && cashier_fridge_rb === 1 && isSupermarket ? 1 : 0;

    // ============================================================
    // RB_Cashier_Cooler_Sup_Comp_Sc  [comp x 15]
    // ============================================================

    out.RB_Cashier_Cooler_Sup_Comp_Sc = rb_cooler_cashier_compliance * 15;

    // ============================================================
    // rb_cooler_cashier_incentive
    // ============================================================

    out.rb_cooler_cashier_incentive = rb_cooler_cashier_compliance === 1 ? 5 : 0;

    // ============================================================ SECTION 11 - LARGE COOLER (impulse & grocery only) ============================================================

    // ============================================================
    // rb_largecooler_compliance
    // ============================================================

    out.rb_largecooler_compliance = isVip && isImpulse && rb_largecooler_present === 1 ? 1 : 0;

    // ============================================================
    // RB_Lg_Cooler_IG_Comp_Sc  [comp x 20]
    // ============================================================

    out.RB_Lg_Cooler_IG_Comp_Sc = rb_largecooler_compliance * 20;

    // ============================================================
    // rb_largecooler_incentive
    // NOT defined in the Red Bull sheet yet -> keeps the stored field value.
    // ============================================================

    out.rb_largecooler_incentive = rb_largecooler_incentive;

    // ============================================================ SECTION 12 - COOLER RESEARCH (bazar only) ============================================================

    // ============================================================
    // rb_cooler_research_compliance
    // ============================================================

    out.rb_cooler_research_compliance = isVip && isBazar && rb_cooler_present === 1 ? 1 : 0;

    // ============================================================
    // RB_Cooler_Research_Ba_Comp_Sc  [comp x 50]
    // ============================================================

    out.RB_Cooler_Research_Ba_Comp_Sc = rb_cooler_research_compliance * 50;

    // ============================================================
    // rb_cooler_research_incentive
    // ============================================================

    out.rb_cooler_research_incentive = rb_cooler_research_compliance === 1 ? 10 : 0;

    // ============================================================ SECTION 13 - CASHIER COOLER PLACEMENT (gas station only) ============================================================

    // ============================================================
    // cashier_place_compliance
    // ============================================================

    out.cashier_place_compliance = isVip && cashier_cooler_placement === 1 && isGas ? 1 : 0;

    // ============================================================
    // Cashier_Place_GAS_Comp_Sc  [comp x 10]
    // ============================================================

    out.Cashier_Place_GAS_Comp_Sc = cashier_place_compliance * 10;

    // ============================================================
    // cashier_place_incentive
    // ============================================================

    out.cashier_place_incentive = cashier_place_compliance === 1 ? 3 : 0;

    // ============================================================ SECTION 14 - TOTALS ============================================================

    // ============================================================
    // TOTAL_SCORE
    // ============================================================

    out.TOTAL_SCORE = SKU_Avail_Sc +
        sos_compliance +
        strike_zone_sc +
        price_comm_comp_sc +
        brand_vis_comp_Sc +
        Outdoor_Comp_Sc +
        Sticky_Shelf_comp_sc +
        Ambient_Place_Comp_Sc +
        RB_Cashier_Cooler_Sup_Comp_Sc +
        RB_Lg_Cooler_IG_Comp_Sc +
        RB_Cooler_Research_Ba_Comp_Sc +
        Cashier_Place_GAS_Comp_Sc;

    // ============================================================
    // totalkpis
    // ============================================================

    out.totalkpis = 0;

    if (isImpulse) {
        out.totalkpis = 5;
    } else if (isSupermarket) {
        out.totalkpis = 6;
    } else if (isBazar) {
        out.totalkpis = 4;
    } else if (isGas) {
        out.totalkpis = 7;
    }

    // ============================================================
    // compliant
    // ============================================================

    out.compliant = 0;

    if (isImpulse) {
        out.compliant =
            rb_availability_compliance +
            strike_zone_comp +
            rb_largecooler_compliance +
            sos_comp_per +
            price_comm;
    }

    else if (isSupermarket) {
        out.compliant =
            rb_availability_compliance +
            strike_zone_comp +
            price_comm +
            sos_comp_per +
            ambient_place_compliance +
            rb_cooler_cashier_compliance;
    }

    else if (isBazar) {
        out.compliant =
            rb_availability_compliance +
            price_comm +
            rb_cooler_research_compliance +
            Outdoor_Visibility_Compliance_SSL_LCS;
    }

    else if (isGas) {
        out.compliant =
            rb_availability_compliance +
            sos_comp_per +
            strike_zone_comp +
            price_comm +
            outdoor_vis_compliance +
            sticky_shelf_place_compliance +
            cashier_place_compliance;
    }

    // ============================================================
    // compliance  [ratio 0-1 per outlet KPI count]
    // ============================================================

    out.compliance = 0;

    if (isVip) {

        // IMPULSE & GROCERY: 5 KPIs
        if (isImpulse) {
            out.compliance = round((
                rb_availability_compliance +
                strike_zone_comp +
                rb_largecooler_compliance +
                sos_comp_per +
                price_comm
            ) / 5, 3);
        }

        // SUPERMARKET: 6 KPIs
        else if (isSupermarket) {
            out.compliance = round((
                rb_availability_compliance +
                strike_zone_comp +
                price_comm +
                sos_comp_per +
                ambient_place_compliance +
                rb_cooler_cashier_compliance
            ) / 6, 3);
        }

        // BAZAR: 4 KPIs
        else if (isBazar) {
            out.compliance = round((
                rb_availability_compliance +
                price_comm +
                rb_cooler_research_compliance +
                Outdoor_Visibility_Compliance_SSL_LCS
            ) / 4, 3);
        }

        // GAS STATION: 7 KPIs
        else if (isGas) {
            out.compliance = round((
                rb_availability_compliance +
                sos_comp_per +
                strike_zone_comp +
                price_comm +
                outdoor_vis_compliance +
                sticky_shelf_place_compliance +
                cashier_place_compliance
            ) / 7, 3);
        }
    }

    // ============================================================
    // totalincentive  [paid only when compliance >= 0.8]
    // ============================================================

    out.totalincentive = compliance < 0.8
            ? 0
            : rb_availability_incentive +
              sos_incentive +
              strike_zone_incentive +
              price_comm_incentive +
              outdoor_vis_incentive +
              Outdoor_Visibility_incentive_SSL_LCS +
              sticky_shelf_incentive +
              ambient_incentive +
              rb_cooler_cashier_incentive +
              rb_cooler_research_incentive +
              cashier_place_incentive +
              rb_largecooler_incentive;

    // ============================================================
    // Return all calculated fields
    // ============================================================

    return out;
};

export default globalExpressions;