import Router from 'express';

import * as mapController from "./map.controller.js";
import { isAuthenticate } from '../../middleware/authentication.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { isAuthorized } from '../../middleware/authorizetion.js';
import { USER_COMPANY, USER_ROLES } from '../../common/constant/user.constant.js';

const mapServerRouter = Router()

//all routes are protected by authentication middleware
mapServerRouter.use(isAuthenticate())

// Layer information
mapServerRouter.get(
  "/layer-info",
  asyncHandler(mapController.clientGetLayerInfo)
);

// Features
mapServerRouter.get(
  "/features",
  asyncHandler(mapController.clientGetFeatures)
)

//only admin and developer can access those two routes
mapServerRouter.use(isAuthorized([USER_ROLES.ADMIN, USER_ROLES.DEVELOPER],[USER_COMPANY.ADHOC]))

// Layer information
mapServerRouter.get(
  "/:project/layer-info",
  asyncHandler(mapController.developerGetLayerInfo)
);

// Features
mapServerRouter.get(
  "/:project/features",
  asyncHandler(mapController.developerGetFeatures)
);

export default mapServerRouter
