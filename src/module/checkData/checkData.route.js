import { Router } from "express";
import { checkDataController } from "./checkData.controller.js";
import { isAuthenticate } from "../../middleware/authentication.js";


const checkDataRouter = Router()


checkDataRouter.use(isAuthenticate())
checkDataRouter.get("/", checkDataController)

export default checkDataRouter