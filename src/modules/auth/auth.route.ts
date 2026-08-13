import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { uploadAvatar } from "../../middlewares/upload-avatar.js";
import { validateRequest } from "../../middlewares/validate-request.js";

import {
  login,
  me,
  register,
  updateProfile,
  updateAvatar,
  googleLogin,
} from "./auth.controller.js";

import { loginSchema, registerSchema } from "./auth.schema.js";

export const authRouter = Router();

authRouter.post("/register", validateRequest(registerSchema), register);

authRouter.post("/login", validateRequest(loginSchema), login);

authRouter.get("/me", authenticate, me);

authRouter.patch("/profile", authenticate, updateProfile);

authRouter.patch(
  "/profile/avatar",
  authenticate,
  uploadAvatar.single("avatar"),
  updateAvatar,
);
authRouter.post("/google", googleLogin);
