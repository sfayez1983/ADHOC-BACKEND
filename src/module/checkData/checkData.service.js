import globalExpressions from "../../common/calc/Global_Expressions.js";

export const checkDataService = async (features, layer) => {
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