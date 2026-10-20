import { USER_COMPANY } from "../../common/constant/user.constant.js";
import * as mapService from "../service/map.service.js";


// ==========================================
// client LAYER INFO
// ==========================================

export const clientGetLayerInfo = async (req, res, next) => {
  try {
    const MONTHS = [
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october"
    ];
    const layer = String(
      req.query.layer || "visits"
    ).toLowerCase();

    const layers = layer === "all" ? MONTHS : [layer];

    const project = req.user.client

    const data =
      await mapService.layerInfoService(layers, project);

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};



// ==========================================
// client QUERY FEATURES
// ==========================================

export const clientGetFeatures = async (req, res, next) => {
  try {
    const MONTHS = [
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october"
    ];

    const layer = String(
      req.query.layer || "all"
    ).toLowerCase();

    const layers = layer === "all" ? MONTHS : [layer];

    const project = req.user.client
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

// ==========================================
// DEVELOPER LAYER INFO
// ==========================================

export const developerGetLayerInfo = async (req, res, next) => {
  try {
    const MONTHS = [
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october"
    ];

    const layer = String(
      req.query.layer || "september"
    ).toLowerCase();

    const layers = layer === "all" ? MONTHS : [layer];
    
    const { project } = req.params

    const data =
      await mapService.layerInfoService(layers, project);

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};


// ==========================================
// DEVELOPER QUERY FEATURES
// ==========================================

export const developerGetFeatures = async (req, res, next) => {

  try {
    const MONTHS = [
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october"
    ];

    const layer = String(
      req.query.layer || "october"
    ).toLowerCase();
    const layers = layer === "all" ? MONTHS : [layer];

    const { project } = req.params
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