import type { Response } from "express";
import { Patient } from "../models/Patient.js";
import { Report } from "../models/Report.js";
import { generatePatientId } from "../utils/idGenerator.js";
import { sendSuccess, sendError, sendPaginated } from "../utils/response.js";
import { qStr, qInt } from "../utils/query.js";
import type { AuthRequest } from "../types/index.js";

// Escape user input so it can be used safely inside a RegExp
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── GET /patients ────────────────────────────────────────────────────────────
// Supports: ?search= &from= &to= &sort=(name|newest|oldest|recent) &page= &limit=
export async function getPatients(req: AuthRequest, res: Response): Promise<void> {
  const page  = Math.max(qInt(req.query.page, 1), 1);
  const limit = Math.min(Math.max(qInt(req.query.limit, 20), 1), 100);
  const skip  = (page - 1) * limit;
  const q     = qStr(req.query.search).trim();
  const from  = qStr(req.query.from);
  const to    = qStr(req.query.to);
  const sort  = qStr(req.query.sort) || "newest";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { empId: rx }, { company: rx }];
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   { const t = new Date(to); t.setHours(23, 59, 59, 999); filter.createdAt.$lte = t; }
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    name:   { name: 1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    recent: { lastReportAt: -1, createdAt: -1 },
  };
  const sortSpec = sortMap[sort] ?? sortMap.newest;

  // Aggregate so every row carries an accurate reportCount + lastReportAt
  // (can't be derived on the client once lists are paginated).
  const [patients, total] = await Promise.all([
    Patient.aggregate([
      { $match: filter },
      { $lookup: { from: "reports", localField: "_id", foreignField: "patientId", as: "_reps" } },
      { $addFields: {
          reportCount:  { $size: "$_reps" },
          lastReportAt: { $max: "$_reps.createdAt" },
      } },
      { $project: { _reps: 0 } },
      { $sort: sortSpec },
      { $skip: skip },
      { $limit: limit },
    ]),
    Patient.countDocuments(filter),
  ]);

  sendPaginated(res, patients, { total, page, limit, pages: Math.ceil(total / limit) });
}

// ─── GET /patients/:id ────────────────────────────────────────────────────────
export async function getPatient(req: AuthRequest, res: Response): Promise<void> {
  const patient = await Patient.findOne({ patientId: req.params.id }).lean();
  if (!patient) { sendError(res, "Patient not found", 404); return; }

  // Attach report count
  const reportCount = await Report.countDocuments({ patientId: patient._id });
  sendSuccess(res, { ...patient, reportCount });
}

// ─── POST /patients ───────────────────────────────────────────────────────────
export async function createPatient(req: AuthRequest, res: Response): Promise<void> {
  // Enforce one patient per Employee ID (case-insensitive)
  const empId = String(req.body.empId ?? "").trim();
  const existing = await Patient.findOne({
    empId: new RegExp(`^${escapeRegex(empId)}$`, "i"),
  }).lean();
  if (existing) {
    sendError(
      res,
      `A patient with Employee ID "${empId}" already exists: ${existing.name} (${existing.patientId}). Add a new report to that patient instead.`,
      409
    );
    return;
  }

  const patientId = await generatePatientId();
  const patient   = await Patient.create({
    ...req.body,
    patientId,
    createdBy: req.user!.userId,
  });
  sendSuccess(res, { patient }, "Patient created", 201);
}

// ─── PUT /patients/:id ────────────────────────────────────────────────────────
export async function updatePatient(req: AuthRequest, res: Response): Promise<void> {
  const patient = await Patient.findOneAndUpdate(
    { patientId: req.params.id },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!patient) { sendError(res, "Patient not found", 404); return; }
  sendSuccess(res, { patient }, "Patient updated");
}

// ─── DELETE /patients/:id ─────────────────────────────────────────────────────
// Admin only (enforced in the route). Cascade-deletes all of the patient's reports.
export async function deletePatient(req: AuthRequest, res: Response): Promise<void> {
  const patient = await Patient.findOne({ patientId: req.params.id });
  if (!patient) { sendError(res, "Patient not found", 404); return; }

  const { deletedCount } = await Report.deleteMany({ patientId: patient._id });
  await patient.deleteOne();

  sendSuccess(
    res,
    { patientId: patient.patientId, deletedReports: deletedCount ?? 0 },
    "Patient and their reports deleted"
  );
}

// ─── GET /patients/:id/reports ────────────────────────────────────────────────
export async function getPatientReports(req: AuthRequest, res: Response): Promise<void> {
  const patient = await Patient.findOne({ patientId: req.params.id });
  if (!patient) { sendError(res, "Patient not found", 404); return; }

  const reports = await Report.find({ patientId: patient._id })
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, { reports, count: reports.length });
}
