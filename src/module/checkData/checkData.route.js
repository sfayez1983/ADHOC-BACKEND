import { Router } from "express";
import * as checkDataController from "./checkData.controller.js";
import { isAuthenticate } from "../../middleware/authentication.js";
import { fileupload } from "../../utils/multer/fileupload.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";


const checkDataRouter = Router()


checkDataRouter.use(isAuthenticate())

//check calculatoin data
checkDataRouter.get("/",
    asyncHandler(checkDataController.checkCalculationDataCon))

//compare 
checkDataRouter.put("/compare", 
fileupload({ mainFolder: 'excels', partFolder: 'files' }).single('file'),
    asyncHandler(checkDataController.compareDataCon)
)

checkDataRouter.get("/read", 
    fileupload({ mainFolder: 'excels', partFolder: 'files' }).single('file'),
    asyncHandler(checkDataController.readCon)
)
export default checkDataRouter