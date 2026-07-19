import type { Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { sendError } from "../utils/response.js";
import type { AuthRequest } from "../types/index.js";

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Read from httpOnly cookie (preferred) or Authorization header (API clients)
    const token: string | undefined =
      req.cookies?.accessToken ??
      req.headers.authorization?.replace(/^Bearer\s+/, "");

    if (!token) {
      sendError(res, "Authentication required", 401);
      return;
    }

    const payload = verifyAccessToken(token);
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    // Don't leak JWT error details
    sendError(res, "Invalid or expired token", 401);
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== "admin") {
    sendError(res, "Admin access required", 403);
    return;
  }
  next();
}
