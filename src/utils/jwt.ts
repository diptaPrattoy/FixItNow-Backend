import jwt, { type JwtPayload } from "jsonwebtoken";

import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { UserRole } from "../generated/prisma/client.js";

type AccessTokenPayload = JwtPayload & {
  sub: string;
  role: UserRole;
};

export const signAccessToken = (userId: string, role: UserRole): string => {
  return jwt.sign({ role }, env.JWT_SECRET, {
    algorithm: "HS256",
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      typeof decoded.role !== "string" ||
      !Object.values(UserRole).includes(decoded.role as UserRole)
    ) {
      throw new AppError(401, "Access token is invalid", {
        code: "TOKEN_INVALID",
      });
    }

    return {
      ...decoded,
      sub: decoded.sub,
      role: decoded.role as UserRole,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof Error && error.name === "TokenExpiredError") {
      throw new AppError(401, "Access token has expired", {
        code: "TOKEN_EXPIRED",
      });
    }

    if (error instanceof Error && error.name === "JsonWebTokenError") {
      throw new AppError(401, "Access token is invalid", {
        code: "TOKEN_INVALID",
      });
    }

    throw error;
  }
};
