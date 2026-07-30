import type { ErrorRequestHandler } from "express";

import { AppError } from "../errors/app-error.js";

type PrismaError = {
  code: string;
  meta?: Record<string, unknown>;
};

const isPrismaError = (error: unknown): error is PrismaError => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (!("code" in error)) {
    return false;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === "string" && code.startsWith("P");
};

const isInvalidJsonError = (error: unknown): boolean => {
  return (
    error instanceof SyntaxError &&
    typeof error === "object" &&
    error !== null &&
    "body" in error
  );
};

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errorDetails: error.errorDetails,
    });

    return;
  }

  if (isInvalidJsonError(error)) {
    res.status(400).json({
      success: false,
      message: "Invalid JSON payload",
      errorDetails: {
        code: "INVALID_JSON",
      },
    });

    return;
  }

  if (isPrismaError(error)) {
    if (error.code === "P2002") {
      res.status(409).json({
        success: false,
        message: "A record with this value already exists",
        errorDetails: {
          code: "DUPLICATE_RECORD",
          fields: error.meta?.target ?? null,
        },
      });

      return;
    }

    if (error.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Requested record was not found",
        errorDetails: {
          code: "RECORD_NOT_FOUND",
        },
      });

      return;
    }

    if (error.code === "P2003") {
      res.status(409).json({
        success: false,
        message: "This operation conflicts with related data",
        errorDetails: {
          code: "RELATION_CONFLICT",
        },
      });

      return;
    }
  }

  console.error(error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    errorDetails: {
      code: "INTERNAL_SERVER_ERROR",
    },
  });
};