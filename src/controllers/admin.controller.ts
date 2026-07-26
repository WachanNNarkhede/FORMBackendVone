import type { Response } from "express";
import { User } from "../models/User.js";
import { sendSuccess, sendError, sendPaginated } from "../utils/response.js";
import { qInt } from "../utils/query.js";
import type { AuthRequest } from "../types/index.js";

// ─── POST /admin/users ────────────────────────────────────────────────────────
// Admin creates a doctor/admin account (self-registration is disabled).
export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  const { name, email, phone, password, role, qualification, registrationNo, clinicName } = req.body;

  const exists = await User.findOne({ email });
  if (exists) { sendError(res, "A user with this email already exists.", 409); return; }

  const user = await User.create({
    name, email, phone, password,
    role: role === "admin" ? "admin" : "doctor",
    qualification, registrationNo, clinicName,
  });

  sendSuccess(res, { user }, "User account created", 201);
}

// ─── GET /admin/users ─────────────────────────────────────────────────────────
export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  const page  = Math.max(qInt(req.query.page, 1), 1);
  const limit = Math.min(Math.max(qInt(req.query.limit, 20), 1), 100);
  const skip  = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find()
      .select("-password -otpHash -otpExpiry -otpAttempts")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(),
  ]);

  sendPaginated(res, users, {
    total, page, limit, pages: Math.ceil(total / limit),
  });
}

// ─── GET /admin/users/:id ─────────────────────────────────────────────────────
export async function getUser(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findById(req.params.id)
    .select("-password -otpHash -otpExpiry")
    .lean();
  if (!user) { sendError(res, "User not found", 404); return; }
  sendSuccess(res, { user });
}

// ─── PATCH /admin/users/:id/role ─────────────────────────────────────────────
export async function changeRole(req: AuthRequest, res: Response): Promise<void> {
  const { role } = req.body as { role: string };

  if (!["doctor", "admin"].includes(role)) {
    sendError(res, "Role must be 'doctor' or 'admin'", 400);
    return;
  }

  // Prevent admin demoting themselves
  if (req.params.id === req.user?.userId) {
    sendError(res, "You cannot change your own role", 400);
    return;
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { role } },
    { new: true, select: "-password -otpHash -otpExpiry" }
  );
  if (!user) { sendError(res, "User not found", 404); return; }

  sendSuccess(res, { user }, `Role updated to ${role}`);
}

// ─── PATCH /admin/users/:id/status ───────────────────────────────────────────
export async function changeStatus(req: AuthRequest, res: Response): Promise<void> {
  const { isActive } = req.body as { isActive: boolean };

  if (typeof isActive !== "boolean") {
    sendError(res, "isActive must be true or false", 400);
    return;
  }

  // Prevent admin deactivating themselves
  if (req.params.id === req.user?.userId) {
    sendError(res, "You cannot deactivate your own account", 400);
    return;
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive } },
    { new: true, select: "-password -otpHash -otpExpiry" }
  );
  if (!user) { sendError(res, "User not found", 404); return; }

  sendSuccess(res, { user }, `Account ${isActive ? "activated" : "deactivated"}`);
}

// ─── DELETE /admin/users/:id ──────────────────────────────────────────────────
export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  if (req.params.id === req.user?.userId) {
    sendError(res, "You cannot delete your own account", 400);
    return;
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) { sendError(res, "User not found", 404); return; }

  sendSuccess(res, null, "User deleted");
}

// ─── GET /admin/stats ─────────────────────────────────────────────────────────
export async function getStats(req: AuthRequest, res: Response): Promise<void> {
  const [total, admins, doctors, inactive] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "admin" }),
    User.countDocuments({ role: "doctor" }),
    User.countDocuments({ isActive: false }),
  ]);

  sendSuccess(res, { total, admins, doctors, inactive });
}
