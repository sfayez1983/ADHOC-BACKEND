import { Router } from "express";
import * as webhookController from "./webhook.controller.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";

const webhookRouter = Router()

// ArcGIS Online webhook -> upload changed outlets' photos to Google Drive
webhookRouter.post("/arcgis/:project/:layer",
    asyncHandler(webhookController.arcgisWebhookCon)
)

// check the URL + key in the browser
webhookRouter.get("/arcgis/:project/:layer",
    asyncHandler(webhookController.arcgisWebhookPingCon)
)

// last webhook calls
webhookRouter.get("/arcgis/:project/:layer/log",
    asyncHandler(webhookController.arcgisWebhookLogCon)
)

export default webhookRouter
