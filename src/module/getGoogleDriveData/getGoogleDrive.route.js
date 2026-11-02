import { Router } from "express";
import * as getGoogleDriveController from "./getGoogleDrive.controller.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";

const getGoogleDriveRouter = Router()

// start: count images in a Drive folder + subfolders -> Excel -> upload to Drive
getGoogleDriveRouter.post("/report",
    asyncHandler(getGoogleDriveController.startFolderReportCon)
)

// all reports
getGoogleDriveRouter.get("/report",
    asyncHandler(getGoogleDriveController.listFolderReportsCon)
)

// one report status / result
getGoogleDriveRouter.get("/report/:jobId",
    asyncHandler(getGoogleDriveController.getFolderReportCon)
)

export default getGoogleDriveRouter
