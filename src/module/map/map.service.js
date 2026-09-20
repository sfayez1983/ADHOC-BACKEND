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

  throw new Error(`Invalid layer: ${layer}`);
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

  console.log({
    url,
    where,
    outFields,
    returnGeometry,
    resultOffset,
    resultRecordCount,
  });


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
// GET ONE LAYER
// ==========================================

const querySingleLayerService = async (
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

        ...feature.attributes,

        // Add month
        month: layer,

        lat:
          feature.geometry?.y ??
          feature.attributes?.lat ??
          0,

        lng:
          feature.geometry?.x ??
          feature.attributes?.lng ??
          0,

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

      return await querySingleLayerService(
        selectedLayer,
        query
      );

    }


    // ======================================
    // ALL = JULY + AUGUST
    // ======================================

    const [july, august] =
      await Promise.all([

        querySingleLayerService(
          "july",
          query
        ),

        querySingleLayerService(
          "august",
          query
        ),

      ]);


    // ======================================
    // MERGE
    // ======================================

    const features = [

      ...july.features,

      ...august.features,

    ];


    return {

      layer: "all",

      count: features.length,

      features,

    };


  } catch (error) {

    throw new Error(

      error.response?.data?.error?.message ||

      error.message ||

      "Failed to query features"

    );

  }

};