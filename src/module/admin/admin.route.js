import { Router } from "express";
import { addUserCon } from "./admin.controller.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { isAuthenticate } from "../../middleware/authentication.js";
import { isAuthorized } from "../../middleware/authorizetion.js";
import { USER_ROLES } from "../../common/constant/user.constant.js";

const adminRouter = Router()

adminRouter.use(isAuthenticate())
adminRouter.use(isAuthorized([USER_ROLES.DEVELOPER, USER_ROLES.ADMIN]))
adminRouter.post("/add",
    asyncHandler(addUserCon)
)

export default adminRouter