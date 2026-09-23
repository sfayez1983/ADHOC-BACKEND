import { USER_COMPANY } from "../../common/constant/user.constant.js";
import * as mapService from "./map.service.js";


// ==========================================
// LAYER INFO
// ==========================================

export const getLayerInfo = async (req, res, next) => {
  try {
    const MONTHS = [
      "july",
      "august",
    ];
    const layer = String(
      req.query.layer || "visits"
    ).toLowerCase();
    
    const layers = layer === "all" ? MONTHS : [layer];
    
    const project = USER_COMPANY.GORILLA

    const data =
      await mapService.layerInfoService(layers, project);

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
    const MONTHS = [
      "september"
    ];

    const layer = String(
      req.query.layer || "september"
    ).toLowerCase();

const layers = layer === "all" ? MONTHS : [layer];

    const project = USER_COMPANY.REDBULL

    const data =
      await mapService.layerInfoService(layers, project);

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
    const MONTHS = [
      "july",
      "august",
    ];

    const layer = String(
      req.query.layer || "visits"
    ).toLowerCase();

    const layers = layer === "all" ? MONTHS : [layer];

    const project = USER_COMPANY.GORILLA
    const data =
      await mapService.queryFeaturesService(
        layers,
        project,
        req.query
      );

    res.status(200).json(data);

  } catch (error) {

    next(error);

  }
};


export const redbullgetFeatures = async (req, res, next) => {

  try {
    const MONTHS = [
      "september"
    ];
    const layer = String(
      req.query.layer || "september"
    ).toLowerCase();
    const layers = layer === "all" ? MONTHS : [layer];

    const project = USER_COMPANY.REDBULL
    const data =
      await mapService.queryFeaturesService(
        layers,
        project,
        req.query
      );

    res.status(200).json(data);

  } catch (error) {

    next(error);

  }
};