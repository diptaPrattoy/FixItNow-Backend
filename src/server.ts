import "dotenv/config";

import app from "./app.js";

const port = Number(process.env.PORT) || 5000;

const server = app.listen(port, () => {
  console.log(`FixItNow API is running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
});

/**
 * Graceful server shutdown
 *
 * This allows the application to stop accepting new requests
 * before the Node.js process exits.
 */
const shutdown = (signal: string): void => {
  console.log(`${signal} received. Shutting down gracefully...`);

  server.close((error?: Error) => {
    if (error) {
      console.error("Error while shutting down the server:", error);
      process.exit(1);
    }

    console.log("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("unhandledRejection", (reason: unknown) => {
  console.error("Unhandled promise rejection:", reason);

  server.close(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});