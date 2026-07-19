import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import compression from "compression";
// hpp removed — incompatible with Express 5 (query is a read-only getter in Express 5)

import { env } from "./config/env.js";
import { apiLimiter } from "./middleware/rateLimiter.middleware.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

import authRoutes   from "./routes/auth.routes.js";
import patientRoutes from "./routes/patient.routes.js";
import reportRoutes from "./routes/report.routes.js";
import exportRoutes from "./routes/export.routes.js";
import adminRoutes  from "./routes/admin.routes.js";

const app = express();

// ─── 1. Security headers (must be first) ─────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'"],
      imgSrc:     ["'self'", "data:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for PDF preview
}));

// ─── 2. CORS — whitelist only frontend origin ─────────────────────────────────
const allowedOrigins = [
  env.FRONTEND_URL.replace(/\/$/, ""),           // strip trailing slash
  env.FRONTEND_URL.replace(/\/$/, "") + "/",     // with trailing slash
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps, curl)
    if (!origin) return callback(null, true);
    const clean = origin.replace(/\/$/, "");
    if (allowedOrigins.map(o => o.replace(/\/$/, "")).includes(clean)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods:     ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── 3. Body parsing (limit size to prevent payload attacks) ──────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── 4. Cookie parser ─────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── 5. NoSQL injection — express-mongo-sanitize removed (Express 5 incompatible)
// Input validation via Zod on every route provides equivalent protection

// ─── 6. HTTP Parameter Pollution — hpp removed (Express 5 incompatible) ──────

// ─── 7. Compression ──────────────────────────────────────────────────────────
app.use(compression());

// ─── 8. Logging (only in dev) ─────────────────────────────────────────────────
if (!env.IS_PROD) {
  app.use(morgan("dev"));
}

// ─── 9. Global rate limit ─────────────────────────────────────────────────────
app.use("/api", apiLimiter);

// ─── 10. Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/reports",  reportRoutes);
app.use("/api/export",   exportRoutes);
app.use("/api/admin",    adminRoutes);

// ─── 11. Health check ─────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", env: env.NODE_ENV });
});

// ─── 12. 404 + Error handler (must be last) ───────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
