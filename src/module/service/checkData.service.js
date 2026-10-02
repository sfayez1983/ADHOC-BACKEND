import globalExpressions from "../../common/calc/Global_Expressions.js";

export const checkGlobalExpressionsService = async (features, layer) => {
    const wrongData = [];

    features.forEach((feature) => {
        const outlet = feature.attributes;

        const correctData = globalExpressions(outlet);

        const wrongFields = {};

        Object.keys(correctData).forEach((field) => {
            if (outlet[field] !== correctData[field]) {
                wrongFields[field] = {
                    actual: outlet[field],
                    expected: correctData[field],
                };
            }
        });

        if (Object.keys(wrongFields).length > 0) {
            wrongData.push({
                customer_code: outlet.customer_code,
                customer_name: outlet.customer_name,
                VIP_Contract: outlet.VIP_Contract,
                wrongFields,
            });
        }
    });


    if (wrongData.length == 0)
        return { message: `all data in layer ${layer} are correct` }

    return {
        layer: "september",
        count: wrongData.length,
        wrongData,
    };
};

export const compareDataService = (features, excelData) => {
    const layer = features?.layers?.[0];
    const portalData = (features?.[layer]?.features ?? []).map(f => f.attributes);

    const getCustomerCode = (data) => String(data?.customer_code ?? "").trim();

    const portalMap = new Map(portalData.map(row => [getCustomerCode(row), row]));
    const excelMap = new Map(excelData.map(row => [getCustomerCode(row), row]));

    // Treat these as "empty / zero"
    const isBlankOrZero = (v) =>
        v === undefined || v === null || String(v).trim() === "" || Number(v) === 0 && String(v).trim() !== "";

    const toBool = (v) => {
        const s = String(v ?? "").trim().toLowerCase();
        if (s === "yes" || s === "1" || s === "true") return true;
        if (s === "no" || s === "0" || s === "false") return false;
        return null; // not a boolean-like value
    };

    // Returns true if the two values mean the same thing
    const valuesAreEquivalent = (excelValue, portalValue) => {
        const e = String(excelValue ?? "").trim();
        const p = String(portalValue ?? "").trim();

        // Exact match after normalization
        if (e === p) return true;

        // Blank / 0 / undefined on both sides  ('' vs 0, 0 vs undefined)
        if (isBlankOrZero(excelValue) && isBlankOrZero(portalValue)) return true;

        // Yes/No <-> 1/0 (case-insensitive)
        const eb = toBool(excelValue);
        const pb = toBool(portalValue);
        if (eb !== null && pb !== null && eb === pb) return true;

        // Numeric match ("5" vs 5, floating strings)
        if (e !== "" && p !== "" && !isNaN(e) && !isNaN(p) && Number(e) === Number(p)) return true;

        return false;
    };

    const differences = [];
    const missingInExcel = [];
    const missingInPortal = [];

    // 1. Excel vs Portal
    excelMap.forEach((excelRow, customerCode) => {
        const portalRow = portalMap.get(customerCode);

        if (!portalRow) {
            missingInPortal.push({ customer_code: customerCode, excelData: excelRow });
            return;
        }

        const wrongFields = {};

        Object.keys(excelRow).forEach(field => {
            if (field === "customer_code") return;

            const excelValue = excelRow[field];
            const portalValue = portalRow[field];

            if (!valuesAreEquivalent(excelValue, portalValue)) {
                wrongFields[field] = { excel: excelValue, portal: portalValue };
            }
        });

        // ==========================================
        // 1. only if real differences remain
        // ==========================================
        if (Object.keys(wrongFields).length > 0) {
            differences.push({ customer_code: customerCode, VIP_Contract: excelRow.VIP_Contract, wrongFields });
        }
    });

    // ==========================================
    // 2. Excel records not in Portal
    // ==========================================
    excelMap.forEach((excelRow, customerCode) => {
        if (!excelMap.has(customerCode)) {
            missingInPortal.push({ excelData: excelRow });
        }
    });


    // ==========================================
    // 3. Portal records not in Excel
    // ==========================================
    portalMap.forEach((portalRow, customerCode) => {
        if (!excelMap.has(customerCode)) {
            missingInExcel.push({portalData: portalRow});
        }
    });


    // ==========================================
    // 3. Return result
    // ==========================================


    return {
        summary: {
            excelRecords: excelMap.size,
            portalRecords: portalMap.size,
            differences: differences.length,
            missingInExcel: missingInExcel.length,
            missingInPortal: missingInPortal.length
        },

        differences,
        missingInExcel,
        missingInPortal
    };
};