import cors from "cors";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const app: Application = express();

/**
 * Security headers
 */
app.use(helmet());

/**
 * CORS
 *
 * A specific frontend origin can be configured later if a frontend
 * is added. Postman is not restricted by browser CORS rules.
 */
app.use(cors());

/**
 * Request-body parsers
 */
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * HTTP request logger
 */
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

/**
 * Root route
 */
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the FixItNow API",
    data: {
      project: "FixItNow",
      description: "Your Trusted Home Service Platform",
      version: "1.0.0",
    },
  });
});

/**
 * Application health route
 */
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "FixItNow API is running",
    data: {
      status: "healthy",
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

/**
 * Database health route
 *
 * This sends a lightweight query to PostgreSQL to confirm that
 * Prisma can communicate with the Neon database.
 */
app.get(
  "/api/health/database",
  async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      res.status(200).json({
        success: true,
        message: "Database connection is healthy",
        data: {
          provider: "PostgreSQL",
          platform: "Neon",
          status: "connected",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Database health check failed:", error);

      res.status(503).json({
        success: false,
        message: "Database connection is unavailable",
        errorDetails: {
          code: "DATABASE_UNAVAILABLE",
        },
      });
    }
  },
);

export default app;