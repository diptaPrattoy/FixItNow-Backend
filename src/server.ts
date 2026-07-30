import type { Server } from "node:http";

import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

let server: Server | undefined;
let isShuttingDown = false;

/**
 * Start the HTTP server only after confirming that the
 * Neon PostgreSQL connection is working.
 */
const startServer = async (): Promise<void> => {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;

  console.log("Neon PostgreSQL database connected successfully");

  server = app.listen(env.PORT, () => {
    console.log(
      `FixItNow API is running on http://localhost:${env.PORT}`,
    );

    console.log(
      `API health: http://localhost:${env.PORT}/api/health`,
    );

    console.log(
      `Database health: http://localhost:${env.PORT}/api/health/database`,
    );
  });
};

/**
 * Gracefully close the HTTP server and database connection.
 */
const shutdown = async (
  reason: string,
  exitCode = 0,
): Promise<void> => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(`${reason} received. Starting graceful shutdown...`);

  if (server) {
    await new Promise<void>((resolve) => {
      server?.close(() => {
        console.log("HTTP server closed");
        resolve();
      });
    });
  }

  await prisma.$disconnect();

  console.log("Prisma database connection closed");

  process.exit(exitCode);
};

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("unhandledRejection", (reason: unknown) => {
  console.error("Unhandled promise rejection:", reason);

  void shutdown("UNHANDLED_REJECTION", 1);
});

process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught exception:", error);

  void shutdown("UNCAUGHT_EXCEPTION", 1);
});

void startServer().catch(async (error: unknown) => {
  console.error("Failed to start the FixItNow API:", error);

  await prisma.$disconnect().catch(() => undefined);

  process.exit(1);
});