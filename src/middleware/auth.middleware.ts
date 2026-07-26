import type { Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { sendError } from "../utils/response.js";
import { User } from "../models/User.js";
import type { AuthRequest } from "../types/index.js";

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
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

    // Re-check against the DB so deactivated/deleted users lose access immediately
    // and role changes take effect without waiting for the token to expire.
    const user = await User.findById(payload.userId).select("role isActive").lean();
    if (!user || !user.isActive) {
      sendError(res, "Account is inactive or no longer exists", 401);
      return;
    }

    req.user = { userId: payload.userId, role: user.role };
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
