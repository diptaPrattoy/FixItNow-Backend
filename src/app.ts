import cors from "cors";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import morgan from "morgan";

const app: Application = express();

/**
 * Security middleware
 *
 * Helmet adds security-related HTTP response headers.
 */
app.use(helmet());

/**
 * CORS middleware
 *
 * A stricter frontend origin will be configured later through
 * environment variables. For now, this allows Postman and API testing.
 */
app.use(cors());

/**
 * Request parsers
 *
 * The JSON size limit helps prevent unnecessarily large request bodies.
 */
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * Development request logger
 */
app.use(morgan("dev"));

/**
 * Root endpoint
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
 * Health-check endpoint
 *
 * This endpoint will later be useful for Render deployment checks.
 */
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "FixItNow API is running",
    data: {
      status: "healthy",
      environment: process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

export default app;