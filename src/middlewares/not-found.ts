import type { RequestHandler } from "express";

import { AppError } from "../errors/app-error.js";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(
    new AppError(
      404,
      `Route ${req.method} ${req.originalUrl} not found`,
      {
        code: "ROUTE_NOT_FOUND",
      },
    ),
  );
};