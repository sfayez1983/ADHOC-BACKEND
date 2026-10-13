import { Router } from "express";
import { addUserCon } from "./admin.controller.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { isAuthenticate } from "../../middleware/authentication.js";

const adminRouter = Router()

adminRouter.use(isAuthenticate())

adminRouter.get("/add",
    asyncHandler(addUserCon)
)