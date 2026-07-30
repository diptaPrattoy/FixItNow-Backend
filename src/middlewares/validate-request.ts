import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { AppError } from "../errors/app-error.js";
import { formatZodError } from "../utils/format-zod-error.js";

export const validateRequest = (schema: ZodType): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      next(
        new AppError(
          400,
          "Validation failed",
          formatZodError(result.error),
        ),
      );

      return;
    }

    const data = result.data as {
      body?: unknown;
    };

    if (data.body !== undefined) {
      req.body = data.body;
    }

    next();
  };
};