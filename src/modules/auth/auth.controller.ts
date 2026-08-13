import type { Request, Response } from "express";
import { AppError } from "../../errors/app-error.js";
import { catchAsync } from "../../utils/catch-async.js";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  updateCurrentUser,
  updateUserAvatar,
} from "./auth.service.js";

export const register = catchAsync(async (req: Request, res: Response) => {
  const result = await registerUser(req.body);

  res.status(201).json({
    success: true,
    message: "Account registered successfully",
    data: result,
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const result = await loginUser(req.body);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: result,
  });
});

export const me = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication is required", {
      code: "AUTHENTICATION_REQUIRED",
    });
  }

  const user = await getCurrentUser(req.user.id);

  res.status(200).json({
    success: true,
    message: "Current user retrieved successfully",
    data: user,
  });
});

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication is required", {
      code: "AUTHENTICATION_REQUIRED",
    });
  }

  const user = await updateCurrentUser(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

export const updateAvatar = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication is required", {
      code: "AUTHENTICATION_REQUIRED",
    });
  }

  if (!req.file) {
    throw new AppError(400, "Profile image is required", {
      code: "AVATAR_REQUIRED",
    });
  }

  const avatarUrl = await updateUserAvatar(req.user.id, req.file);

  res.status(200).json({
    success: true,
    message: "Profile picture updated successfully",
    data: await getCurrentUser(req.user.id),
  });
});
