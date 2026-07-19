import type { Request } from "express";
import type { Types } from "mongoose";

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  role:   UserRole;
  iat?:   number;
  exp?:   number;
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role:   UserRole;
  };
}

export type UserRole = "doctor" | "admin";

// ─── API response envelope ────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?:   T;
  errors?: Record<string, string[]>;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationMeta {
  total:   number;
  page:    number;
  limit:   number;
  pages:   number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}
