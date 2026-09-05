import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import compression from "compression";

import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

import { apiLimiter } from "./middleware/rateLimiter.middleware.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import patientRoutes from "./routes/patient.routes.js";
import reportRoutes from "./routes/report.routes.js";
import exportRoutes from "./routes/export.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import designationRoutes from "./routes/designation.routes.js";

const app = express();

/* ─────────────────────────────────────────────────────────────
   1. SECURITY HEADERS
   ───────────────────────────────────────────────────────────── */

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
      },
    },

    // Needed for PDF preview
    crossOriginEmbedderPolicy: false,
  })
);

/* ─────────────────────────────────────────────────────────────
   2. CORS
   ───────────────────────────────────────────────────────────── */

const allowedOrigins = [
  "https://form-frontend-vone.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin
      // Example: Postman, curl, server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error(`❌ CORS blocked: ${origin}`);

      return callback(new Error(`CORS blocked: ${origin}`));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

/* ─────────────────────────────────────────────────────────────
   3. BODY PARSING
   ───────────────────────────────────────────────────────────── */

app.use(
  express.json({
    limit: "10kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10kb",
  })
);

/* ─────────────────────────────────────────────────────────────
   4. COOKIE PARSER
   ───────────────────────────────────────────────────────────── */

app.use(cookieParser());

/* ─────────────────────────────────────────────────────────────
   5. COMPRESSION
   ───────────────────────────────────────────────────────────── */

app.use(compression());

/* ─────────────────────────────────────────────────────────────
   6. LOGGING
   ───────────────────────────────────────────────────────────── */

if (!env.IS_PROD) {
  app.use(morgan("dev"));
}

/* ─────────────────────────────────────────────────────────────
   7. DATABASE CONNECTION
   ───────────────────────────────────────────────────────────── */

/*
  IMPORTANT:

  Locally, server.ts calls connectDB().

  On Vercel, server.ts is NOT executed.
  Vercel loads app.ts directly.

  Therefore we connect to MongoDB here as well.
*/

app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

/* ─────────────────────────────────────────────────────────────
   8. GLOBAL API RATE LIMITER
   ───────────────────────────────────────────────────────────── */

app.use("/api", apiLimiter);

/* ─────────────────────────────────────────────────────────────
   9. API ROUTES
   ───────────────────────────────────────────────────────────── */

app.use("/api/auth", authRoutes);

app.use("/api/patients", patientRoutes);

app.use("/api/reports", reportRoutes);

app.use("/api/export", exportRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/designations", designationRoutes);

/* ─────────────────────────────────────────────────────────────
   10. HEALTH CHECK
   ───────────────────────────────────────────────────────────── */

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    env: env.NODE_ENV,
  });
});

/* ─────────────────────────────────────────────────────────────
   11. 404 HANDLER
   ───────────────────────────────────────────────────────────── */

app.use(notFound);

/* ─────────────────────────────────────────────────────────────
   12. GLOBAL ERROR HANDLER
   ───────────────────────────────────────────────────────────── */

app.use(errorHandler);

/* ─────────────────────────────────────────────────────────────
   EXPORT EXPRESS APP
   ───────────────────────────────────────────────────────────── */

export default app;