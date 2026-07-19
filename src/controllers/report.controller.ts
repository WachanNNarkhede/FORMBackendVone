import type { Response } from "express";
import { Report } from "../models/Report.js";
import { Patient } from "../models/Patient.js";
import { generateReportId, generateSNo } from "../utils/idGenerator.js";
import { sendSuccess, sendError, sendPaginated } from "../utils/response.js";
import type { AuthRequest } from "../types/index.js";

// Escape user input so it can be used safely inside a RegExp
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── GET /reports/summary ─────────────────────────────────────────────────────
// Lightweight counts for the dashboard (avoids loading full lists client-side).
export async function getSummary(_req: AuthRequest, res: Response): Promise<void> {
  const now        = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [patients, reports, certified, thisMonth] = await Promise.all([
    Patient.countDocuments({}),
    Report.countDocuments({}),
    Report.countDocuments({ status: "certified" }),
    Report.countDocuments({ createdAt: { $gte: startMonth } }),
  ]);

  sendSuccess(res, { patients, reports, certified, thisMonth });
}

// ─── GET /reports ─────────────────────────────────────────────────────────────
// Supports: ?search= &status= &patientId= &from= &to= &sort=(newest|oldest) &page= &limit=
export async function getReports(req: AuthRequest, res: Response): Promise<void> {
  const page      = Math.max(parseInt(req.query.page as string ?? "1"), 1);
  const limit     = Math.min(Math.max(parseInt(req.query.limit as string ?? "20"), 1), 100);
  const skip      = (page - 1) * limit;
  const status    = req.query.status as string;
  const patientId = req.query.patientId as string;
  const q         = (req.query.search as string ?? "").trim();
  const from      = req.query.from as string;
  const to        = req.query.to   as string;
  const sort      = (req.query.sort as string) || "newest";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (status && status !== "all") filter.status = status;
  if (patientId) {
    const patient = await Patient.findOne({ patientId }).select("_id");
    filter.patientId = patient ? patient._id : null;   // null → no matches if patient missing
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   { const t = new Date(to); t.setHours(23, 59, 59, 999); filter.createdAt.$lte = t; }
  }
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    // Match report ID directly, or any patient whose name/empId matches
    const matchingPatients = await Patient.find({ $or: [{ name: rx }, { empId: rx }] }).select("_id");
    filter.$or = [
      { reportId: rx },
      { patientId: { $in: matchingPatients.map((p) => p._id) } },
    ];
  }

  const sortSpec: Record<string, 1 | -1> = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate("patientId", "name empId company patientId")
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments(filter),
  ]);

  sendPaginated(res, reports, {
    total, page, limit, pages: Math.ceil(total / limit),
  });
}

// ─── GET /reports/:id ─────────────────────────────────────────────────────────
export async function getReport(req: AuthRequest, res: Response): Promise<void> {
  const report = await Report.findOne({ reportId: req.params.id })
    .populate("patientId", "name empId company designation patientId bloodGroup")
    .lean();
  if (!report) { sendError(res, "Report not found", 404); return; }
  sendSuccess(res, { report });
}

// ─── POST /reports ────────────────────────────────────────────────────────────
export async function createReport(req: AuthRequest, res: Response): Promise<void> {
  // Verify patient exists
  const patient = await Patient.findById(req.body.patientId);
  if (!patient) { sendError(res, "Patient not found", 404); return; }

  const [reportId, sNo] = await Promise.all([
    generateReportId(),
    generateSNo(),
  ]);

  const report = await Report.create({
    ...req.body,
    reportId,
    sNo,
    createdBy: req.user!.userId,
  });

  // Return with patient populated
  const populated = await report.populate("patientId", "name empId company patientId");
  sendSuccess(res, { report: populated }, "Report created", 201);
}

// ─── PUT /reports/:id ─────────────────────────────────────────────────────────
// In-place update — keeps the same reportId and sNo, edits the existing record.
export async function updateReport(req: AuthRequest, res: Response): Promise<void> {
  // Never allow these to change via an edit
  const update: Record<string, unknown> = { ...req.body, updatedBy: req.user!.userId };
  delete update.reportId;
  delete update.sNo;
  delete update.patientId;   // patient association stays stable
  delete update.createdBy;
  delete update.createdAt;

  const report = await Report.findOneAndUpdate(
    { reportId: req.params.id },
    { $set: update },
    { new: true, runValidators: true }
  ).populate("patientId", "name empId company patientId");

  if (!report) { sendError(res, "Report not found", 404); return; }
  sendSuccess(res, { report }, "Report updated");
}

// ─── DELETE /reports/:id ──────────────────────────────────────────────────────
// Admin only (enforced in the route).
export async function deleteReport(req: AuthRequest, res: Response): Promise<void> {
  const report = await Report.findOneAndDelete({ reportId: req.params.id });
  if (!report) { sendError(res, "Report not found", 404); return; }
  sendSuccess(res, { reportId: report.reportId }, "Report deleted");
}

// ─── PATCH /reports/:id/status ────────────────────────────────────────────────
export async function updateReportStatus(req: AuthRequest, res: Response): Promise<void> {
  const { status } = req.body as { status: string };
  const valid = ["draft", "submitted", "certified"];
  if (!valid.includes(status)) {
    sendError(res, "Invalid status value", 400);
    return;
  }

  const report = await Report.findOneAndUpdate(
    { reportId: req.params.id },
    { $set: { status, updatedBy: req.user!.userId } },
    { new: true }
  );
  if (!report) { sendError(res, "Report not found", 404); return; }
  sendSuccess(res, { report }, "Status updated");
}
