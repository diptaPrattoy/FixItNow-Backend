import "dotenv/config";

import { z } from "zod";

const postgresUrlSchema = z
  .string()
  .min(1, "DATABASE_URL is required")
  .refine(
    (value) =>
      value.startsWith("postgresql://") || value.startsWith("postgres://"),
    {
      message: "DATABASE_URL must be a PostgreSQL connection string",
    },
  );

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

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

  JWT_SECRET: z
    .string()
    .min(10, "JWT_SECRET must contain at least 10 characters"),

  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(604800),

  APP_BASE_URL: z
    .string()
    .url("APP_BASE_URL must be a valid URL")
    .transform((value) => value.replace(/\/+$/, "")),

  SSLCOMMERZ_STORE_ID: z.string().min(1, "SSLCOMMERZ_STORE_ID is required"),

  SSLCOMMERZ_STORE_PASSWORD: z
    .string()
    .min(1, "SSLCOMMERZ_STORE_PASSWORD is required"),

  SSLCOMMERZ_IS_LIVE: booleanString.default(false),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const messages = result.error.issues.map((issue) => {
    const field = issue.path.join(".") || "environment";
    return `${field}: ${issue.message}`;
  });

  console.error("Invalid environment configuration:");
  console.error(messages.join("\n"));

  throw new Error("Application environment is not configured correctly");
}

export const env = result.data;
