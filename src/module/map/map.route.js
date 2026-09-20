import Router from 'express';

import * as mapController from "./map.controller.js";

const mapServerRouter = Router()



// Layer information
mapServerRouter.get(
  "/layer-info",
  mapController.getLayerInfo
);


// Features
mapServerRouter.get(
  "/features",
  mapController.getFeatures
);



export default mapServerRouter
