import axios from "axios";
import { arcgisGet, arcgisPost } from "../../utils/arcgis/arcgisGet.js";
import { getLayersConfig } from "../../../config/projectLayers.config.js";

const PAGE_SIZE = 2000;
const PAGE_CONCURRENCY = 4; // pages fetched in parallel per layer


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
// QUERY ARCGIS (POST)
// ==========================================
// POST is used so long outFields / where values are sent in the body.
// With GET they end up in the URL and ArcGIS rejects long URLs.

const queryLayer = async (url, token, params) => {
  const response = await arcgisPost(`${url}/query`, {
    f: "json",
    ...params,
    token,
  });

  const data = response.data;

  if (data.error) {
    throw new Error(data.error.message || "ArcGIS query failed");
  }

  return data;
};

const fetchPage = ({ url, token, where, outFields, returnGeometry, orderByFields, resultOffset, resultRecordCount }) =>
  queryLayer(url, token, {
    where,
    outFields,
    returnGeometry,
    orderByFields, // stable order so pages never overlap or skip rows
    resultOffset,
    resultRecordCount,
  });

const fetchCount = async (url, token, where) => {
  const data = await queryLayer(url, token, { where, returnCountOnly: true });
  return Number(data.count) || 0;
};

// ==========================================
// GET ONE FEATURE LAYER
// ==========================================

const querySingleFeatureLayerService = async (layer, project, query = {}) => {

  const { url, token } = await getLayersConfig(layer, project);

  //prepare queries data
  const where = query.where || "1=1";
  const returnGeometry = query.returnGeometry === "false" ? false : true;
  const requestedCount = Number(query.resultRecordCount) || PAGE_SIZE;

  // outFields: trim spaces, drop empty and duplicate names
  const rawOutFields = Array.isArray(query.outFields) ? query.outFields.join(",") : String(query.outFields || "*");
  const outFieldsArray = [...new Set(rawOutFields.split(",").map((f) => f.trim()).filter(Boolean))];
  const outFields = outFieldsArray.length === 0 || outFieldsArray.includes("*") ? "*" : outFieldsArray.join(",");

  const info = await getSingleLayerInfo(layer, project);

  if (outFields !== "*") {
    const known = new Set((info.fields || []).map((f) => f.name.toLowerCase()));
    const invalid = outFieldsArray.filter((field) => !known.has(field.toLowerCase()));

    if (invalid.length > 0) {
      throw new Error(`Invalid outFields: ${invalid.join(", ")}`);
    }
  }

  const orderByFields = info.objectIdField || "OBJECTID";
  const pageParams = { url, token, where, outFields, returnGeometry, orderByFields };

  // First page tells us the real page size (the server may cap it below ours)
  const firstPage = await fetchPage({ ...pageParams, resultOffset: 0, resultRecordCount: requestedCount });
  const firstFeatures = firstPage.features || [];
  const pages = [firstFeatures];

  if (firstPage.exceededTransferLimit === true && firstFeatures.length > 0) {
    const pageSize = firstFeatures.length;
    const total = await fetchCount(url, token, where);

    const offsets = [];
    for (let off = pageSize; off < total; off += pageSize) offsets.push(off);

    // fetch the remaining pages a few at a time (order kept via the index)
    let next = 0;
    const worker = async () => {
      while (next < offsets.length) {
        const i = next++;
        const data = await fetchPage({ ...pageParams, resultOffset: offsets[i], resultRecordCount: pageSize });
        pages[i + 1] = data.features || [];
      }
    };
    await Promise.all(Array.from({ length: Math.min(PAGE_CONCURRENCY, offsets.length) }, worker));
  }

  // ==========================================
  // MAP FEATURES
  // ==========================================

  const mappedFeatures = [];
  for (const page of pages) {
    for (const feature of page || []) {
      mappedFeatures.push({
        attributes: {
          // Add month
          month: layer,
          ...feature.attributes,
        },
        geometry: feature.geometry || null,
      });
    }
  }

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