export const getLayersConfig = async (layer, project) => {
    if (project == "gorilla") {
        if (layer === "visits") {
            return {
                url: process.env.GORILLA_SERVICE_FEATURE_SERVER,
                token: process.env.GORILLA_SERVICE_TOKEN,
            };
        }

        if (layer === "july") {
            return {
                url: process.env.GORILLA_July_SERVER,
                token: process.env.GORILLA_July_August_SERVICE_TOKEN,
            };
        }

        if (layer === "august") {
            return {
                url: process.env.GORILLA_AUGUST_SERVER,
                token: process.env.GORILLA_July_August_SERVICE_TOKEN,
            };
        }
    }

    if (project == "redbull") {
        if (layer === "september") {
            return {
                url: process.env.REDBULL_SERVICE_FEATURE_SERVER_SEPTEMPER,
                token: process.env.REDBULL_SERVICE_TOKEN,
            };
        }

        if (layer === "august") {
            return {
                url: process.env.REDBULL_SERVICE_FEATURE_SERVER_AUGUST,
                token: process.env.REDBULL_SERVICE_TOKEN,
            };
        }

        if (layer === "july") {
            return {
                url: process.env.REDBULL_SERVICE_FEATURE_SERVER_JULY,
                token: process.env.REDBULL_SERVICE_TOKEN,
            };
        }

        if (layer === "june") {
            return {
                url: process.env.REDBULL_SERVICE_FEATURE_SERVER_JUNE,
                token: process.env.REDBULL_SERVICE_TOKEN,
            };
        }

        if (layer === "may") {
            return {
                url: process.env.REDBULL_SERVICE_FEATURE_SERVER_MAY,
                token: process.env.REDBULL_SERVICE_TOKEN,
            };
        }

    }

    throw new Error(`Invalid project/layer: ${project}/${layer}`);
}