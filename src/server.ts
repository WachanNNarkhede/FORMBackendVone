import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import app from "./app.js";

async function start(): Promise<void> {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀  MedFit API running on http://localhost:${env.PORT}`);
    console.log(`    Environment: ${env.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully`);
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));

  // Unhandled rejections — log and exit (let process manager restart)
  process.on("unhandledRejection", (err) => {
    console.error("Unhandled rejection:", err);
    server.close(() => process.exit(1));
  });
}

start();
