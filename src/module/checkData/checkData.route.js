import { Router } from "express";
import * as checkDataController from "./checkData.controller.js";
import { isAuthenticate } from "../../middleware/authentication.js";
import { fileupload } from "../../utils/multer/fileupload.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { isAuthorized } from "../../middleware/authorizetion.js";
import { USER_COMPANY, USER_ROLES } from "../../common/constant/user.constant.js";


const checkDataRouter = Router()


checkDataRouter.use(isAuthenticate())
checkDataRouter.use(isAuthorized([USER_ROLES.ADMIN, USER_ROLES.DEVELOPER],[USER_COMPANY.ADHOC]))

//check calculatoin data
checkDataRouter.get("/",
    asyncHandler(checkDataController.checkCalculationDataCon))

//compare 
checkDataRouter.put("/compare", 
fileupload({ mainFolder: 'excels', partFolder: 'files' }).single('file'),
    asyncHandler(checkDataController.compareDataCon)
)

//read excel
checkDataRouter.get("/read", 
    fileupload({ mainFolder: 'excels', partFolder: 'files' }).single('file'),
    asyncHandler(checkDataController.readCon)
)

//get attachment
checkDataRouter.get("/attachment", 
    asyncHandler(checkDataController.getAttachment)
)

//get attachment as excel (photos per keyword per outlet)
checkDataRouter.get("/attachment/excel",
    asyncHandler(checkDataController.getAttachmentExcel)
)
//upload attachments to google drive (runs in background)
checkDataRouter.post("/attachment/drive",
    asyncHandler(checkDataController.uploadAttachmentsToDriveCon)
)

//list upload jobs
checkDataRouter.get("/attachment/drive",
    asyncHandler(checkDataController.listDriveUploadJobsCon)
)

//fill LinkGoogleDrive for folders uploaded earlier (dryRun=true by default)
checkDataRouter.post("/attachment/drive/links",
    asyncHandler(checkDataController.backfillDriveLinksCon)
)

//upload job status
checkDataRouter.get("/attachment/drive/:jobId",
    asyncHandler(checkDataController.getDriveUploadJobCon)
)

export default checkDataRouter