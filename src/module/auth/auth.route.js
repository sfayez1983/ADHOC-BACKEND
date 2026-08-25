import { Router } from "express";
import * as authController from "./auth.controller.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";


const authRouter = Router()

authRouter.post('/signup', asyncHandler(authController.signup))