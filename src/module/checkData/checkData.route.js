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

//recalculate changed outlets and update the feature layer
checkDataRouter.post("/sync",
    asyncHandler(checkDataController.syncCalculatedDataCon))

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

export default checkDataRouter