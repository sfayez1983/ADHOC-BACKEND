import Router from 'express';

import * as mapController from "./map.controller.js";
import { isAuthenticate } from '../../middleware/authentication.js';

const mapServerRouter = Router()

mapServerRouter.use(isAuthenticate())
// Layer information
mapServerRouter.get(
  "/gorilla/layer-info",
  mapController.getLayerInfo
);

// Features
mapServerRouter.get(
  "/gorilla/features",
  mapController.getFeatures
)

// Layer information
mapServerRouter.get(
  "/redbull/layer-info",
  mapController.redbullgetLayerInfo
);

// Features
mapServerRouter.get(
  "/redbull/features",
  mapController.redbullgetFeatures
);

export default mapServerRouter
