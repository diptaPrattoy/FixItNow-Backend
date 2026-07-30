import "dotenv/config";

import { z } from "zod";

/**
 * Accept PostgreSQL connection strings beginning with either:
 * - postgresql://
 * - postgres://
 */
const postgresUrlSchema = z
  .string()
  .min(1, "DATABASE_URL is required")
  .refine(
    (value) =>
      value.startsWith("postgresql://") ||
      value.startsWith("postgres://"),
    {
      message:
        "DATABASE_URL must be a valid PostgreSQL connection string",
    },
  );

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int("PORT must be an integer")
    .positive("PORT must be greater than zero")
    .max(65535, "PORT must not be greater than 65535")
    .default(5000),

  DATABASE_URL: postgresUrlSchema,
});

const parsedEnvironment = envSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const errorMessages = parsedEnvironment.error.issues.map((issue) => {
    const variableName = issue.path.join(".") || "environment";

    return `${variableName}: ${issue.message}`;
  });

  console.error("Invalid environment configuration:");
  console.error(errorMessages.join("\n"));

  throw new Error("The application environment is not configured correctly");
}

export const env = parsedEnvironment.data;