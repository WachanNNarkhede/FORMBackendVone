import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,   // 30s — Atlas needs more time than local
      socketTimeoutMS:          45000,
      connectTimeoutMS:         30000,
    });
    console.log(`✅  MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error("❌  MongoDB connection failed:", err);
    process.exit(1);
  }

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️   MongoDB disconnected — reconnecting...");
  });
}
