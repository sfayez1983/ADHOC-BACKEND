import { USER_COMPANY } from "../../common/constant/user.constant.js";
import * as mapService from "../service/map.service.js";


// ==========================================
// GORILLA LAYER INFO
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
// REDBULL LAYER INFO
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
// GORILLA QUERY FEATURES
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

// ==========================================
// REDBULL QUERY FEATURES
// ==========================================

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
    //   const attachments = await mapService.getAttachmentsService(data.september.features.map((feature) => feature.attributes?.OBJECTID),
    //     layers, project
    // )

    // res.status(200).json({ data, attachments });
    res.status(200).json(data);

  } catch (error) {

    next(error);

  }
};