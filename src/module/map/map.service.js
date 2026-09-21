import axios from "axios";

const PAGE_SIZE = 2000;


// ==========================================
// GET LAYER CONFIG
// ==========================================

const getLayerConfig = async (layer) => {

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

  if (layer === "september") {
    return {
      url: process.env.REDBULL_SERVICE_FEATURE_SERVER,
      token: process.env.REDBULL_SERVICE_TOKEN,
    };
  }

  throw new Error(`Invalid layer: ${layer}`);
};

// ==========================================
// GET ONE LAYER INFO
// ==========================================

const getSingleLayerInfo = async (layer) => {
  const { url, token } = await getLayerConfig(layer);

  if (!url) {
    throw new Error(`URL is missing for layer "${layer}"`);
  }

  const response = await axios.get(url, {
    params: {
      f: "json",
      token,
    },
  });

  if (response.data.error) {
    throw new Error(
      response.data.error.message || "Failed to get layer info"
    );
  }

  return response.data;
};

// ==========================================
// LAYER INFO SERVICE
// ==========================================

export const layerInfoService = async (layer) => {
  // layer=all
  if (layer === "all") {
    const [july, august] = await Promise.all([
      getSingleLayerInfo("july"),
      getSingleLayerInfo("august"),
    ]);

    return {
      layers: {
        july,
        august,
      },
    };
  }

  // specific layer
  return getSingleLayerInfo(layer);
};

// ==========================================
// FETCH PAGE
// ==========================================

const fetchPage = async ({
  url,
  token,
  where,
  outFields,
  returnGeometry,
  resultOffset,
  resultRecordCount,
}) => {

  const response = await axios.get(`${url}/query`, {

    params: {
      f: "json",
      where,
      outFields,
      returnGeometry,
      resultOffset,
      resultRecordCount,
      token,
    },
  });


  const data = response.data;


  if (data.error) {
    throw new Error(data.error.message);
  }


  return data;
};

// ==========================================
// GET ONE FEATURE LAYER
// ==========================================

const querySingleFeatureLayerService = async (
  layer,
  query = {}
) => {

  const {
    url,
    token,
  } = await getLayerConfig(layer);


  const where =
    query.where || "1=1";


  const outFields =
    query.outFields || "*";


  const returnGeometry =
    query.returnGeometry === "false"
      ? false
      : true;


  const resultRecordCount =
    Number(query.resultRecordCount) ||
    PAGE_SIZE;


  let allFeatures = [];

  let offset = 0;

  let hasMore = true;

  if(outFields !== "*") {
    const outFieldsArray = outFields.toLowerCase().split(",");
    console.log("outFields: ", outFieldsArray);

    const { fields } = await getSingleLayerInfo(layer);
    let fieldsExsit = outFieldsArray.filter((field) => !fields.some((f) => f.name.toLowerCase() === field.toLowerCase()));
    if (fieldsExsit.length > 0) {
      throw new Error(`Invalid outFields: ${fieldsExsit.join(", ")}`);
    }
  }

  while (hasMore) {

    const data = await fetchPage({

      url,
      token,

      where,
      outFields,
      returnGeometry,

      resultOffset: offset,

      resultRecordCount,

    });


    const features =
      data.features || [];


    allFeatures.push(...features);


    hasMore =
      data.exceededTransferLimit === true &&
      features.length > 0;


    offset += resultRecordCount;


    if (features.length === 0) {
      hasMore = false;
    }

  }


  // ==========================================
  // MAP FEATURES
  // ==========================================

  const mappedFeatures =
    allFeatures.map((feature) => ({

      attributes: {
        // Add month
        month: layer,

        ...feature.attributes,

      },

      geometry:
        feature.geometry || null,

    }));


  return {

    layer,

    count: mappedFeatures.length,

    features: mappedFeatures,

  };

};


// ==========================================
// GET FEATURES
// ==========================================

export const queryFeaturesService = async (
  layer,
  query = {}
) => {

  try {

    const selectedLayer =
      String(layer || "visits")
        .toLowerCase();


    // ======================================
    // SINGLE LAYER
    // ======================================

    if (selectedLayer !== "all") {

      return await querySingleFeatureLayerService(
        selectedLayer,
        query
      );

    }


    // ======================================
    // ALL = JULY + AUGUST
    // ======================================

    const [july, august] =
      await Promise.all([

        querySingleFeatureLayerService(
          "july",
          query
        ),

        querySingleFeatureLayerService(
          "august",
          query
        ),

      ]);


    // ======================================
    // MERGE
    // ======================================

    const features = {

      july,

      august,
    };


    return {

      layer: "july + august",

      count: features.july.count + features.august.count,

      ...features,

    };


  } catch (error) {

    throw new Error(

      error.response?.data?.error?.message ||

      error.message ||

      "Failed to query features"

    );

  }

};