import type { RequestHandler } from "express";

import { AppError } from "../errors/app-error.js";
import { UserStatus } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { catchAsync } from "../utils/catch-async.js";
import { verifyAccessToken } from "../utils/jwt.js";

export const authenticate: RequestHandler = catchAsync(
  async (req, _res, next) => {
    const authorization = req.headers.authorization;
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1]?.trim();

    if (!token) {
      throw new AppError(401, "Authentication token is required", {
        code: "AUTH_TOKEN_REQUIRED",
      });
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new AppError(401, "Authenticated user no longer exists", {
        code: "AUTH_USER_NOT_FOUND",
      });
    }

    if (user.status === UserStatus.BANNED) {
      throw new AppError(403, "Your account has been banned", {
        code: "ACCOUNT_BANNED",
      });
    }

    req.user = user;
    next();
  },
);