const globalExpressions = (feature) => {
    const get = (field, defaultValue = 0) => {
        const value = feature[field];

        if (value === null || value === undefined || value === "") {
            return defaultValue;
        }

        return value;
    };

    const text = (field) => {
        return String(get(field, "")).trim().toLowerCase();
    };

    // ============================================================
    // Basic values
    // ============================================================

    const status = text("status");
    const project = text("project");
    const outlet = String(feature.VIP_Contract ?? "").trim().toLowerCase();
    const priceComm = String(feature.rb_price_comm_main ?? "").trim().toLowerCase();
    const strikezone_main = String(feature.rb_strikezone_main ?? "").trim().toLowerCase();
    const add_amb_placement = String(feature.additional_ambient_placement ?? "").trim().toLowerCase();
    const outdoor = String(feature.outdoor_visibility_materials ?? "").trim().toLowerCase();

    const sos = Number(feature.sos_compliance ?? 0)
    const strike_comp = Number(feature.strike_zone_comp ?? 0);
    const pricing = Number(feature.price_comm ?? 0);
    const outdoor_comp = Number(feature.outdoor_vis_compliance ?? 0)
    const addin_sticky_shelf_cnt = Number(feature.addin_sticky_shelf_cnt ?? 0);
    const sticky_comp = Number(feature.sticky_shelf_place_compliance ?? 0)
    const amb_comp = Number(feature.ambient_place_compliance ?? 0)
    const B_cooler = Number(feature.rb_cooler_research_compliance ?? 0)
    const S_cashier = Number(feature.rb_cooler_cashier_compliance ?? 0)
    const Gs_cooler = Number(feature.cashier_place_compliance ?? 0);
    const lgCooler_comp = Number(feature.rb_largecooler_compliance ?? 0);
    const largeCoolerPresent = Number(feature.rb_largecooler_present ?? 0);
    const facesPct = Number(feature.rb_faces_pct ?? 0);
    const shelves = Number(feature.rb_complete_shelves_cnt ?? 0);
    const availability_comp = Number(feature.rb_availability_compliance ?? 0);
    const supermarket_cash_fg = Number(feature.cashier_fridge_rb ?? 0)
    const gasStation_cash_cooler_place = Number(feature.cashier_cooler_placement ?? 0);
    const bazar_rb_cooler = Number(feature.rb_cooler_present ?? 0);
    const Shop_Sign_Lightbox = Number(feature.Shop_Sign_Lightbox ?? 0);
    const ILLUMINATED_CAN_SIGN = Number(feature.ILLUMINATED_CAN_SIGN ?? 0);
    const Shop_Sign_Lightbox_comp = Number(feature.Outdoor_Visibility_Compliance_SSL_LCS ?? 0);


    // ============================================================
    // rb_total_faces
    // ============================================================

    const rb_total_faces =
        Number(feature.rb_original_facings) +
        Number(feature.rb_sf_facings) +
        Number(feature.rb_white_facings) +
        Number(feature.rb_purple_facings) +
        Number(feature.rb_seablue_facings) +
        Number(feature.rb_zero_facing) +
        Number(feature.rb_other_facings);

    // ============================================================
    // Comp_total_faces
    // ============================================================

    const Comp_total_faces =
        Number(feature.sting_facings) +
        Number(feature.fury_facings) +
        Number(feature.monster_facings) +
        Number(feature.other_ed_facings);

    // ============================================================
    // total_facings
    // ============================================================

    const total_facings = rb_total_faces + Comp_total_faces;

    // ============================================================
    // rb_faces_pct
    // ============================================================

    const rb_faces_pct =
        total_facings > 0 ? Number(((rb_total_faces / total_facings) * 100).toFixed(1)) : 0;

    // ============================================================
    // Redbull_Availability
    // ============================================================

    const availabilityFaces =
        Number(feature.rb_ed_250ml_shelf_avail) +
        Number(feature.rb_sf_250ml_shelf_avail) +
        Number(feature.rb_white_250ml_shelf_avl) +
        Number(feature.rb_purple_250ml_shelf_avl) +
        Number(feature.rb_seablue_250ml_shelf_avl) +
        Number(feature.rb_zero_250ml_shelf_avail);

    const Redbull_Availability =
        availabilityFaces > 0 ? Number(((availabilityFaces / 6) * 100).toFixed(1)) : 0;

    // ============================================================
    // rb_availability_compliance
    // ============================================================

    const rb_availability_compliance =
        Redbull_Availability === 100 ? 1 : 0;

    // ============================================================
    // rb_availability_incentive
    // ============================================================

    let rb_availability_incentive =
        outlet == "gas station" && availability_comp == 1 ? 3 : 0

    // ============================================================
    // totalkpis
    // ============================================================

    let totalkpis = 0;

    if (outlet === "impulse & grocery") {
        totalkpis = 5;
    } else if (outlet === "supermarket") {
        totalkpis = 6;
    } else if (outlet === "bazar") {
        totalkpis = 4;
    } else if (outlet === "gas station") {
        totalkpis = 7;
    }

    // ============================================================
    // sos_incentive
    // ============================================================


    let sos_incentive = 0;

    // ============================================================
    // Only successful VIP visits and NOT Bazar
    // ============================================================

    if (outlet === "bazar") {
        sos_incentive = 0;
    }

    // ============================================================
    // SUPERMARKET
    // ============================================================

    else if (outlet === "supermarket") {

        if (
            availability_comp === 1 &&
            strikezone_main === "yes" &&
            priceComm === "yes" &&
            facesPct >= 70 &&
            shelves === 2
        ) {
            sos_incentive = 10;
        }

        else if (
            availability_comp === 1 &&
            strikezone_main === "yes" &&
            priceComm === "yes" &&
            facesPct >= 70 &&
            shelves >= 3
        ) {
            sos_incentive = 22;
        }
    }

    // ============================================================
    // IMPULSE & GROCERY
    // ============================================================

    else if (outlet === "impulse & grocery") {

        if (
            availability_comp === 1 &&
            strikezone_main === "yes" &&
            largeCoolerPresent === 1 &&
            priceComm === "yes" &&
            shelves === 1
        ) {
            sos_incentive = 10;
        }

        else if (
            availability_comp === 1 &&
            strikezone_main === "yes" &&
            largeCoolerPresent === 1 &&
            priceComm === "yes" &&
            shelves === 2
        ) {
            sos_incentive = 25;
        }

        else if (
            availability_comp === 1 &&
            strikezone_main === "yes" &&
            largeCoolerPresent === 1 &&
            priceComm === "yes" &&
            shelves >= 3
        ) {
            sos_incentive = 32;
        }
    }

    // ============================================================
    // GAS STATION
    // ============================================================

    else if (outlet === "gas station") {

        if (shelves < 2) {
            sos_incentive = 0;
        }

        else if (facesPct >= 80) {
            sos_incentive = 7;
        }

        else if (facesPct >= 70) {
            sos_incentive = 5;
        }

        else if (facesPct >= 60) {
            sos_incentive = 1.5;
        }
    }
    // ============================================================
    // sos_compliance
    // ============================================================

    const sos_compliance = sos_incentive > 0 ? 1 : 0;

    // ============================================================
    // strike_zone_comp
    // All outlets except Bazar
    // ============================================================

    const validStrikeOutlets = [
        "impulse & grocery",
        "gas station",
        "supermarket",
    ];

    const strike_zone_comp =
        validStrikeOutlets.includes(outlet) && strikezone_main === "yes"
            ? 1
            : 0;

    // ============================================================
    // strike_zone_incentive
    // ============================================================

    const strike_zone_incentive =
        outlet === "gas station" && strike_comp === 1
            ? 2
            : 0;

    // ============================================================
    // price_comm
    // ============================================================

    const validPriceOutlets = [
        "gas station",
        "supermarket",
        "bazar",
        "impulse & grocery",
    ];

    const price_comm =
        priceComm === "yes" && validPriceOutlets.includes(outlet) ? 1 : 0;

    // ============================================================
    // price_comm_incentive
    // ============================================================

    const price_comm_incentive =
        pricing === 1 && outlet === "gas station" ? 1 : 0;


    // ============================================================
    //    
    // ============================================================



    // ============================================================
    // compliant
    // ============================================================

    let compliant = 0;

    if (outlet === "impulse & grocery") {
        compliant =
            availability_comp +
            strike_comp +
            lgCooler_comp +
            sos +
            pricing;
    }

    if (outlet === "supermarket") {
        compliant =
            availability_comp +
            strike_comp +
            pricing +
            sos +
            amb_comp +
            S_cashier;
    }

    if (outlet === "bazar") {
        compliant =
            availability_comp +
            pricing +
            B_cooler +
            Shop_Sign_Lightbox_comp;
    }

    if (outlet === "gas station") {
        compliant =
            availability_comp +
            sos +
            strike_comp +
            pricing +
            outdoor_comp +
            sticky_comp +
            Gs_cooler;
    }

    // ============================================================
    // compliance
    // ============================================================

    let compliance = 0;

    if (status === "زيارة ناجحة" && project === "vip") {
        compliance =
            totalkpis > 0
                ? Number(((compliant / totalkpis) * 100).toFixed(2))
                : 0;
    }

    // ============================================================
    // totalincentive
    // ============================================================

    const totalincentive =
        Number(feature.rb_availability_incentive) +
        Number(feature.sos_incentive) +
        Number(feature.strike_zone_incentive) +
        Number(feature.price_comm_incentive) +
        Number(feature.outdoor_vis_incentive) +
        Number(feature.Outdoor_Visibility_incentive_SSL_LCS) +
        Number(feature.sticky_shelf_incentive) +
        Number(feature.ambient_incentive) +
        Number(feature.rb_cooler_cashier_incentive) +
        Number(feature.rb_cooler_research_incentive) +
        Number(feature.cashier_place_incentive) +
        Number(feature.rb_largecooler_incentive);


    // ============================================================ IMPULSE & GROCERY - EXPRESSIONS ============================================================

    // ============================================================
    // rb_largecooler_compliance
    // ============================================================

    let rb_largecooler_compliance = 0

    largeCoolerPresent === 1 && outlet === "impulse & grocery" ?
        rb_largecooler_compliance = 1 : rb_largecooler_compliance = 0;


    // ============================================================ SUPERMARKET ============================================================

    // ============================================================
    //rb_cooler_cashier_compliance
    // ============================================================

    var rb_cooler_cashier_compliance = 0
    if (outlet === "supermarket" && supermarket_cash_fg == 1 && priceComm == "yes" && strike_comp == 1 && availability_comp == 1)
        rb_cooler_cashier_compliance = 1
    else
        rb_cooler_cashier_compliance = 0

    // ============================================================

    // ============================================================
    //rb_cooler_cashier_incentive
    // ============================================================

    let rb_cooler_cashier_incentive = 0
    if (outlet === "supermarket" && S_cashier == 1)
        rb_cooler_cashier_incentive = 5
    else
        rb_cooler_cashier_incentive = 0

    // ============================================================

    // ============================================================
    ////ambient_place_compliance
    // ============================================================

    let ambient_place_compliance = 0
    if (outlet == "supermarket" && add_amb_placement == 1 && priceComm == "yes" && strike_comp == 1 && availability_comp == 1)
        ambient_place_compliance = 1
    else
        ambient_place_compliance = 0

    let ambient_incentive = 0
    if (amb_comp == 1)
        ambient_incentive = 5
    else
        ambient_incentive = 0

    // ============================================================ GAS STATION ============================================================


    // ============================================================
    //sticky_shelf_place_compliance
    // ============================================================

    let sticky_shelf_place_compliance = 0
    if (outlet == "gas station" && addin_sticky_shelf_cnt >= 1)
        sticky_shelf_place_compliance = 1
    else
        sticky_shelf_place_compliance = 0

    // ============================================================
    //sticky_shelf_incentive
    // ============================================================

    let sticky_shelf_incentive = 0
    if (sticky_comp == 1 || outlet == "gas station") {
        addin_sticky_shelf_cnt >= 2 ?
            sticky_shelf_incentive = 2 : addin_sticky_shelf_cnt == 1 ?
                sticky_shelf_incentive = 1 : sticky_shelf_incentive = 0
    };

    // ============================================================

    // ============================================================
    //cashier_place_compliance
    // ============================================================

    let cashier_place_compliance = 0


    if (outlet == "gas station" && gasStation_cash_cooler_place == 1)
        cashier_place_compliance = 1
    else
        cashier_place_compliance = 0

    // ============================================================
    //cashier_place_incentive
    // ============================================================

    let cashier_place_incentive = 0
    if (outlet == "gas station" && Gs_cooler == 1)
        cashier_place_incentive = 3
    else
        cashier_place_incentive = 0


    // ============================================================
    //outdoor_vis_compliance
    // ============================================================

    let outdoor_vis_compliance = 0
    if (outlet == "gas station" && outdoor == "yes")
        outdoor_vis_compliance = 1
    else
        outdoor_vis_compliance = 0


    // ============================================================
    //outdoor_vis_incentive
    // ============================================================

    let outdoor_vis_incentive = 0
    if (outdoor_comp == 1)
        outdoor_vis_incentive = 1
    else
        outdoor_vis_incentive = 0

    // ============================================================ BAZAR ============================================================

    // ============================================================
    // rb_cooler_research_compliance
    //=============================================================

    let rb_cooler_research_compliance = 0
    if (outlet == "bazar" && bazar_rb_cooler == 1)
        rb_cooler_research_compliance = 1
    else
        rb_cooler_research_compliance = 0

    // ============================================================
    // rb_cooler_research_incentive
    //=============================================================

    let rb_cooler_research_incentive = 0
    if (B_cooler == 1 && priceComm == "yes" && availability_comp == 1)
        rb_cooler_research_incentive = 10
    else
        rb_cooler_research_incentive = 0

    // ============================================================
    //Outdoor_Visibility_Compliance_SSL_LCS
    // ============================================================

    let Outdoor_Visibility_Compliance_SSL_LCS = 0
    if (outlet == "bazar" && Shop_Sign_Lightbox == 1 || ILLUMINATED_CAN_SIGN == 1)
        Outdoor_Visibility_Compliance_SSL_LCS = 1
    else
        Outdoor_Visibility_Compliance_SSL_LCS = 0

    // ============================================================
    //Outdoor_Visibility_incentive_SSL_LCS
    // ============================================================

    let Outdoor_Visibility_incentive_SSL_LCS = 0
    if (outlet == "bazar" && Shop_Sign_Lightbox_comp == 1)
        Outdoor_Visibility_incentive_SSL_LCS = 5
    else
        Outdoor_Visibility_incentive_SSL_LCS = 0

    // ============================================================
    // Return all calculated fields
    // ============================================================

    return {
        total_facings,
        Comp_total_faces,
        rb_total_faces,
        rb_faces_pct,

        Redbull_Availability,
        rb_availability_compliance,
        rb_availability_incentive,

        totalkpis,
        compliant,
        compliance,
        totalincentive,

        sos_compliance,
        sos_incentive,

        strike_zone_comp,
        strike_zone_incentive,

        price_comm,
        price_comm_incentive,

        rb_largecooler_compliance,

        rb_cooler_cashier_compliance,
        rb_cooler_cashier_incentive,

        ambient_place_compliance,
        ambient_incentive,

        sticky_shelf_place_compliance,
        sticky_shelf_incentive,

        cashier_place_compliance,
        cashier_place_incentive,

        outdoor_vis_compliance,
        outdoor_vis_incentive,

        rb_cooler_research_compliance,
        rb_cooler_research_incentive,

        Outdoor_Visibility_Compliance_SSL_LCS,
        Outdoor_Visibility_incentive_SSL_LCS
    };
};

export default globalExpressions;