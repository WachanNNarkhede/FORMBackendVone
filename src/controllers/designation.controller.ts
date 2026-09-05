import type { Response } from "express";
import { Designation } from "../models/Designation.js";
import { sendSuccess, sendError } from "../utils/response.js";
import type { AuthRequest } from "../types/index.js";

// ─── GET /designations ─── list saved custom designations (shared by all users)
export async function listDesignations(_req: AuthRequest, res: Response): Promise<void> {
  const docs = await Designation.find().sort({ value: 1 }).select("value").lean();
  sendSuccess(res, { designations: docs.map((d) => d.value) });
}

// ─── POST /designations ─── save a new custom designation (idempotent)
export async function addDesignation(req: AuthRequest, res: Response): Promise<void> {
  const value = String(req.body?.value ?? "").trim();
  if (!value || value.length > 100) { sendError(res, "Invalid designation value", 400); return; }
  await Designation.updateOne({ value }, { $setOnInsert: { value } }, { upsert: true });
  sendSuccess(res, { value }, "Designation saved");
}
