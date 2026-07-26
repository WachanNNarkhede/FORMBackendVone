import rateLimit from "express-rate-limit";
import { sendError } from "../utils/response.js";
import { env } from "../config/env.js";

const isDev = !env.IS_PROD;

// Auth routes — strict in prod, relaxed in dev
export const authLimiter = rateLimit({
  windowMs:        1 * 1000,
  max:             isDev ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (_req, res) => {
    sendError(res, "Too many attempts. Try again in 1 minutes.", 429);
  },
});

// General API — relaxed in dev
export const apiLimiter = rateLimit({
  windowMs:        1 * 1000,
  max:             isDev ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (_req, res) => {
    sendError(res, "Too many requests. Slow down.", 429);
  },
});

// Export routes — relaxed in dev
export const exportLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             isDev ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (_req, res) => {
    sendError(res, "Export rate limit reached. Wait a moment.", 429);
  },
});
