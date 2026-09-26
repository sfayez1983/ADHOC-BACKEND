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

export const compareDataService = async (features, excelData) => {
    // Portal data -> array of attributes
    const portalData = features.map(feature => feature.attributes);

    // Normalize customer_code
    const getCustomerCode = (data) =>
        String(data?.customer_code ?? "").trim();

    // Create Maps for fast lookup
    const portalMap = new Map(
        portalData.map(row => [
            getCustomerCode(row),
            row
        ])
    );

    const excelMap = new Map(
        excelData.map(row => [
            getCustomerCode(row),
            row
        ])
    );

    const differences = [];
    const missingInExcel = [];
    const missingInPortal = [];

    // ==========================================
    // 1. Compare Excel records against Portal
    // ==========================================

    excelMap.forEach((excelRow, customerCode) => {

        const portalRow = portalMap.get(customerCode);

        // Excel exists but Portal doesn't
        if (!portalRow) {
            missingInPortal.push({
                customer_code: customerCode,
                excelData: excelRow
            });

            return;
        }

        const wrongFields = {};

        // Compare every field from Excel
        Object.keys(excelRow).forEach(field => {

            // Don't compare customer_code
            if (field === "customer_code") return;

            const excelValue = excelRow[field];
            const portalValue = portalRow[field];

            const normalizedExcel = String(
                excelValue ?? ""
            ).trim();

            const normalizedPortal = String(
                portalValue ?? ""
            ).trim();

            if (normalizedExcel !== normalizedPortal) {

                wrongFields[field] = {
                    excel: excelValue,
                    portal: portalValue
                };
            }
        });

        // There are differences
        if (Object.keys(wrongFields).length > 0) {
            differences.push({
                customer_code: customerCode,
                wrongFields
            });
        }
    });


    // ==========================================
    // 2. Find records existing in Portal
    //    but missing from Excel
    // ==========================================

    portalMap.forEach((portalRow, customerCode) => {

        if (!excelMap.has(customerCode)) {

            missingInExcel.push({
                customer_code: customerCode,
                portalData: portalRow
            });
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