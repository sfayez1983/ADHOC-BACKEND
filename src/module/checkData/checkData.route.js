import { Router } from "express";
import * as checkDataController from "./checkData.controller.js";
import { isAuthenticate } from "../../middleware/authentication.js";
import { fileupload } from "../../utils/multer/fileupload.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";


const checkDataRouter = Router()


// checkDataRouter.use(isAuthenticate())

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
//upload attachments to google drive (runs in background)
checkDataRouter.post("/attachment/drive",
    asyncHandler(checkDataController.uploadAttachmentsToDriveCon)
)

//list upload jobs
checkDataRouter.get("/attachment/drive",
    asyncHandler(checkDataController.listDriveUploadJobsCon)
)

//upload job status
checkDataRouter.get("/attachment/drive/:jobId",
    asyncHandler(checkDataController.getDriveUploadJobCon)
)

export default checkDataRouter