import type { ZodError } from "zod";

export const formatZodError = (error: ZodError) => {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "request",
    message: issue.message,
  }));
};