import Router from 'express';

import * as mapController from "./map.controller.js";
import { isAuthenticate } from '../../middleware/authentication.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const mapServerRouter = Router()

// mapServerRouter.use(isAuthenticate())
// Layer information
mapServerRouter.get(
  "/gorilla/layer-info",
  asyncHandler(mapController.getLayerInfo)
);

// Features
mapServerRouter.get(
  "/gorilla/features",
  asyncHandler(mapController.getFeatures)
)

// Layer information
mapServerRouter.get(
  "/redbull/layer-info",
 asyncHandler(mapController.redbullgetLayerInfo)
);

// Features
mapServerRouter.get(
  "/redbull/features",
 asyncHandler(mapController.redbullgetFeatures)
);

export default mapServerRouter
