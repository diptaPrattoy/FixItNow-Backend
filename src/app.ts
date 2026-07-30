import cors from "cors";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { AppError } from "./errors/app-error.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { prisma } from "./lib/prisma.js";
import { catchAsync } from "./utils/catch-async.js";

import { authRouter } from "./modules/auth/auth.route.js";

import { publicRouter } from "./modules/public/public.route.js";

import { technicianRouter } from "./modules/technician/technician.route.js";

import {
  customerBookingRouter,
  technicianBookingRouter,
} from "./modules/booking/booking.route.js";

import { paymentRouter } from "./modules/payment/payment.route.js";

const app: Application = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

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

app.get(
  "/api/health/database",
  catchAsync(async (_req: Request, res: Response) => {
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
    } catch {
      throw new AppError(503, "Database connection is unavailable", {
        code: "DATABASE_UNAVAILABLE",
      });
    }
  }),
);

app.use("/api/auth", authRouter);
app.use("/api", publicRouter);

app.use("/api/bookings", customerBookingRouter);

app.use("/api/payments", paymentRouter);

app.use("/api/technician/bookings", technicianBookingRouter);

app.use("/api/technician", technicianRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
