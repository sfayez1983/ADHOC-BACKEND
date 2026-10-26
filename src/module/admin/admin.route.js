import { Router } from "express";
import { addUserCon } from "./admin.controller.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { isAuthenticate } from "../../middleware/authentication.js";
import { isAuthorized } from "../../middleware/authorizetion.js";
import { USER_COMPANY, USER_ROLES } from "../../common/constant/user.constant.js";

const adminRouter = Router()

adminRouter.use(isAuthenticate())
adminRouter.use(isAuthorized([USER_ROLES.DEVELOPER, USER_ROLES.ADMIN],[USER_COMPANY.ADHOC]))
adminRouter.post("/add",
    asyncHandler(addUserCon)
)

export default adminRouter