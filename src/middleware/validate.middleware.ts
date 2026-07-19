import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { sendError } from "../utils/response.js";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        errors[key] = [...(errors[key] ?? []), issue.message];
      }
      sendError(res, "Validation failed", 422, errors);
      return;
    }
    // Replace req.body with the sanitized/coerced Zod output
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      sendError(res, "Invalid query parameters", 422);
      return;
    }
    req.query = result.data as typeof req.query;
    next();
  };
}
