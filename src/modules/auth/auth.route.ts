import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
  login,
  me,
  register,
} from "./auth.controller.js";
import {
  loginSchema,
  registerSchema,
} from "./auth.schema.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateRequest(registerSchema),
  register,
);

authRouter.post(
  "/login",
  validateRequest(loginSchema),
  login,
);

authRouter.get("/me", authenticate, me);