import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Mongoose duplicate key
  if ((err as NodeJS.ErrnoException).name === "MongoServerError") {
    const code = (err as NodeJS.ErrnoException & { code?: number }).code;
    if (code === 11000) {
      res.status(409).json({ success: false, message: "Record already exists" });
      return;
    }
  }

  // Mongoose validation
  if (err.name === "ValidationError") {
    res.status(422).json({ success: false, message: "Validation failed", errors: err.message });
    return;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    res.status(400).json({ success: false, message: "Invalid ID format" });
    return;
  }

  // Operational errors we threw intentionally
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  // Unknown errors — log full details server-side, send generic message to client
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: env.IS_PROD
      ? "Something went wrong. Please try again later."
      : err.message,
  });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: "Route not found" });
}
