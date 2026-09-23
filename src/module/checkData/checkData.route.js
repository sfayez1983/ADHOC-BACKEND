import { Router } from "express";
import { checkDataController } from "./checkData.controller.js";


const checkDataRouter = Router()

checkDataRouter.get("/", checkDataController)

export default checkDataRouter