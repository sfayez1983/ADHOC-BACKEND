import axios from "axios";
import { arcgisGet } from "../../utils/arcgis/arcgisGet.js";
import { getLayersConfig } from "../../../config/projectLayers.config.js";

const PAGE_SIZE = 2000;


// ==========================================
// GET LAYER CONFIG
// ==========================================

// const getLayerConfig = async (layer) => {

//   if (layer === "visits") {
//     return {
//       url: process.env.GORILLA_SERVICE_FEATURE_SERVER,
//       token: process.env.GORILLA_SERVICE_TOKEN,
//     };
//   }

//   if (layer === "july") {
//     return {
//       url: process.env.GORILLA_July_SERVER,
//       token: process.env.GORILLA_July_August_SERVICE_TOKEN,
//     };
//   }

//   if (layer === "august") {
//     return {
//       url: process.env.GORILLA_AUGUST_SERVER,
//       token: process.env.GORILLA_July_August_SERVICE_TOKEN,
//     };
//   }

//   if (layer === "september") {
//     return {
//       url: process.env.REDBULL_SERVICE_FEATURE_SERVER,
//       token: process.env.REDBULL_SERVICE_TOKEN,
//     };
//   }

//   throw new Error(`Invalid layer: ${layer}`);
// };

// ==========================================
// GET ONE LAYER INFO
// ==========================================

const getSingleLayerInfo = async (layer, project) => {
  const { url, token } = await getLayersConfig(layer, project);

  if (!url) {
    throw new Error(`URL is missing for layer "${layer}"`);
  }

  //get layer info from arcgis 
  const response = await arcgisGet(url, {
    f: "json",
    token,
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

export const layerInfoService = async (layers, project) => {

  //get all layer or selected layer info data
  const results = await Promise.all(
    layers.map(async (month) => {
      const info = await getSingleLayerInfo(month, project);
      return [month, info];
    })
  );

  return {
    layers: Object.fromEntries(results),
  };
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

  const response = await arcgisGet(`${url}/query`, {
    f: "json",
    where,
    outFields,
    returnGeometry,
    resultOffset,
    resultRecordCount,
    token,
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

const querySingleFeatureLayerService = async (layer, project, query = {}) => {

  const { url, token } = await getLayersConfig(layer, project);

  //prepare queries data
  const where = query.where || "1=1";
  const outFields = query.outFields || "*";
  const returnGeometry = query.returnGeometry === "false" ? false : true;
  const resultRecordCount = Number(query.resultRecordCount) || PAGE_SIZE;


  let allFeatures = [];
  let offset = 0;
  let hasMore = true;

  if (outFields !== "*") {
    const outFieldsArray = outFields.toLowerCase().split(",");
    const { fields } = await getSingleLayerInfo(layer, project);

    let fieldsExsit = outFieldsArray.filter((field) =>
      !fields.some((f) =>
        f.name.toLowerCase() === field.toLowerCase()
      ));
      
    (fieldsExsit);
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

    const features = data.features || [];
    allFeatures.push(...features);
    hasMore = data.exceededTransferLimit === true && features.length > 0;
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
      geometry: feature.geometry || null,
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

export const queryFeaturesService = async (layers, project, query = {}) => {

  //get feature layers data 
  const results = await Promise.all(
    layers.map(async (month) => {
      const info = await querySingleFeatureLayerService(month, project, query);
      return [month, info];
    })
  );

  //count total outlets in all layers
  let outletsCount = 0
  results.forEach(([layer, data]) => {
    outletsCount += data.count;
  });

  //return data
  return {
    layers,
    count: outletsCount,
    ...Object.fromEntries(results),
  };
};

// ==========================================
//GET ATTACHMENTS
// ==========================================

export const getAttachmentsService = async (objectIds, layers, project) => {
  const { url, token } = await getLayersConfig(layers[0], project);

  if (!objectIds?.length) return [];

  const BATCH_SIZE = 200;
  const allAttachments = [];

  for (let i = 0; i < objectIds.length; i += BATCH_SIZE) {
    const batchIds = objectIds.slice(i, i + BATCH_SIZE);

    const response = await axios.get(`${url}/queryAttachments`,
      {
        params: {
          f: "json",
          objectIds: batchIds.join(","),
          returnUrl: true,
          token,
        },
      }
    );

    const attachmentGroups = response.data.attachmentGroups || [];
    allAttachments.push(...attachmentGroups);
  }

  return {
    count: allAttachments.reduce((total, attachment) => total + attachment.attachmentInfos.length, 0),
    allAttachments
  };
};