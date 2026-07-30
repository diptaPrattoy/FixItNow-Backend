import type { RequestHandler } from "express";

import { AppError } from "../errors/app-error.js";
import type { UserRole } from "../generated/prisma/client.js";

export const authorizeRoles = (
  ...allowedRoles: UserRole[]
): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      next(
        new AppError(401, "Authentication is required", {
          code: "AUTHENTICATION_REQUIRED",
        }),
      );

      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new AppError(
          403,
          "You do not have permission to perform this action",
          {
            code: "FORBIDDEN",
            requiredRoles: allowedRoles,
          },
        ),
      );

      return;
    }

    next();
  };
};