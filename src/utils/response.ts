import type { Response } from "express";
import type { ApiResponse, PaginatedResponse, PaginationMeta } from "../types/index.js";

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200
): void {
  const body: ApiResponse<T> = { success: true, message, data };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: Record<string, string[]>
): void {
  const body: ApiResponse = { success: false, message, errors };
  res.status(statusCode).json(body);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  message = "Success"
): void {
  const body: PaginatedResponse<T> = { success: true, message, data, pagination };
  res.status(200).json(body);
}
