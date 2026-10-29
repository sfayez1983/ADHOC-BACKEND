import { Router } from "express";
import * as attachmentController from "./attachment.controller.js";
import { isAuthenticate } from "../../middleware/authentication.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { isAuthorized } from "../../middleware/authorizetion.js";
import { USER_COMPANY, USER_ROLES } from "../../common/constant/user.constant.js";


const attachmentRouter = Router()

//use auth
attachmentRouter.use(isAuthenticate())
attachmentRouter.use(isAuthorized([USER_ROLES.ADMIN, USER_ROLES.DEVELOPER],[USER_COMPANY.ADHOC]))

//get attachment
attachmentRouter.get("/", 
    asyncHandler(attachmentController.getAttachment)
)

//get attachment as excel (photos per keyword per outlet)
attachmentRouter.get("/excel",
    asyncHandler(attachmentController.getAttachmentExcel)
)
//upload attachments to google drive (runs in background)
attachmentRouter.post("/drive",
    asyncHandler(attachmentController.uploadAttachmentsToDriveCon)
)

//list upload jobs
attachmentRouter.get("/drive",
    asyncHandler(attachmentController.listDriveUploadJobsCon)
)

//fill LinkGoogleDrive for folders uploaded earlier (dryRun=true by default)
attachmentRouter.post("/drive/links",
    asyncHandler(attachmentController.backfillDriveLinksCon)
)

//upload job status
attachmentRouter.get("/drive/:jobId",
    asyncHandler(attachmentController.getDriveUploadJobCon)
)

export default attachmentRouter