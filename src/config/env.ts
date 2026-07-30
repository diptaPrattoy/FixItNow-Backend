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

  JWT_EXPIRES_IN: z.coerce
    .number()
    .int("JWT_EXPIRES_IN must be an integer")
    .positive("JWT_EXPIRES_IN must be greater than zero")
    .default(604800),
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
