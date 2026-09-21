import * as mapService from "./map.service.js";


// ==========================================
// LAYER INFO
// ==========================================

export const getLayerInfo = async (req, res, next) => {
  try {
    const layer = String(
      req.query.layer || "visits"
    ).toLowerCase();

    const data =
      await mapService.layerInfoService(layer);

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// LAYER INFO
// ==========================================

export const redbullgetLayerInfo = async (req, res, next) => {
  try {
    const layer = String(
      req.query.layer || "september"
    ).toLowerCase();

    const data =
      await mapService.layerInfoService(layer);

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};


// ==========================================
// QUERY FEATURES
// ==========================================

export const getFeatures = async (req, res, next) => {

  try {

    const layer = String(
      req.query.layer || "september"
    ).toLowerCase();


    const data =
      await mapService.queryFeaturesService(
        layer,
        req.query
      );
      
    res.status(200).json(data);

  } catch (error) {

    next(error);

  }
};