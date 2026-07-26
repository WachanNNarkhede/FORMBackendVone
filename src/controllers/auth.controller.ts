import type { Request, Response } from "express";
import crypto from "crypto";
import { User } from "../models/User.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { sendOtpEmail } from "../utils/email.js";
import { generateOtp, hashOtp, verifyOtp, otpExpiry, isOtpExpired, MAX_ATTEMPTS } from "../utils/otp.js";
import { env } from "../config/env.js";
import type { AuthRequest } from "../types/index.js";

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   env.COOKIE_SECURE,
  sameSite: "strict" as const,
  path:     "/",
};

const LOGIN_MAX_ATTEMPTS = 5;
const LOCK_DURATION      = 30 * 60 * 1000;

// ─── Register ─────────────────────────────────────────────────────────────────
export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, phone, password, qualification, registrationNo, clinicName } = req.body;

  // ── Public self-registration is only allowed to bootstrap the FIRST admin.
  //    After that, accounts are created by an admin (POST /admin/users). This
  //    prevents strangers from registering and reading patient data. ──────────
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    sendError(res, "Self-registration is disabled. Ask an administrator to create your account.", 403);
    return;
  }

  const exists = await User.findOne({ email });
  if (exists) {
    sendError(res, "Registration failed. Check your details.", 409);
    return;
  }

  const role = "admin"; // first user ever

  const user = await User.create({
    name, email, phone, password,
    qualification, registrationNo, clinicName,
    role,
  });

  console.log(`\n🔑  First user registered — granted ADMIN role: ${email}\n`);

  const accessToken  = signAccessToken({ userId: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ userId: user._id.toString(), role: user.role });

  res.cookie("accessToken",  accessToken,  { ...COOKIE_OPTS, maxAge: 8 * 60 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

  sendSuccess(res, { user }, role === "admin" ? "Admin account created" : "Account created", 201);
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (user?.isLocked()) {
    sendError(res, "Account temporarily locked. Try again later.", 423);
    return;
  }

  const isValid = user ? await user.comparePassword(password) : false;

  if (!user || !isValid) {
    if (user) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= LOGIN_MAX_ATTEMPTS) {
        user.lockUntil     = new Date(Date.now() + LOCK_DURATION);
        user.loginAttempts = 0;
      }
      await user.save();
    }
    sendError(res, "Invalid email or password", 401);
    return;
  }

  if (!user.isActive) {
    sendError(res, "Account is deactivated. Contact your admin.", 403);
    return;
  }

  user.loginAttempts = 0;
  user.lockUntil     = undefined;
  user.lastLogin     = new Date();
  await user.save();

  const accessToken  = signAccessToken({ userId: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ userId: user._id.toString(), role: user.role });

  res.cookie("accessToken",  accessToken,  { ...COOKIE_OPTS, maxAge: 8 * 60 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

  sendSuccess(res, { user }, "Login successful");
}

// ─── Forgot password — Step 1 ─────────────────────────────────────────────────
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  const user = await User.findOne({ email });
  const SAFE_MSG = "If this email is registered, an OTP has been sent.";

  if (!user || !user.isActive) { sendSuccess(res, null, SAFE_MSG); return; }
  if (user.otpExpiry && !isOtpExpired(user.otpExpiry)) { sendSuccess(res, null, SAFE_MSG); return; }

  const otp    = generateOtp();
  const hashed = await hashOtp(otp);

  user.otpHash     = hashed;
  user.otpExpiry   = otpExpiry();
  user.otpAttempts = 0;
  await user.save();

  const sent = await sendOtpEmail(email, otp);
  if (!sent) {
    user.otpHash = undefined; user.otpExpiry = undefined;
    await user.save();
    sendError(res, "Failed to send OTP email. Please try again.", 503);
    return;
  }
  sendSuccess(res, null, SAFE_MSG);
}

// ─── Forgot password — Step 2: Verify OTP ────────────────────────────────────
export async function verifyOtpAndGetResetToken(req: Request, res: Response): Promise<void> {
  const { email, otp } = req.body as { email: string; otp: string };
  const user = await User.findOne({ email }).select("+otpHash +otpExpiry +otpAttempts");

  if (!user || !user.otpHash || !user.otpExpiry) { sendError(res, "Invalid or expired OTP", 400); return; }

  if (isOtpExpired(user.otpExpiry)) {
    user.otpHash = undefined; user.otpExpiry = undefined; await user.save();
    sendError(res, "OTP has expired. Request a new one.", 400); return;
  }

  if (user.otpAttempts >= MAX_ATTEMPTS) {
    user.otpHash = undefined; user.otpExpiry = undefined; await user.save();
    sendError(res, "Too many wrong attempts. Request a new OTP.", 429); return;
  }

  const isValid = await verifyOtp(otp, user.otpHash);
  if (!isValid) {
    user.otpAttempts += 1; await user.save();
    const remaining = MAX_ATTEMPTS - user.otpAttempts;
    sendError(res, `Invalid OTP. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`, 400);
    return;
  }

  const resetToken       = crypto.randomBytes(32).toString("hex");
  const resetTokenHashed = crypto.createHash("sha256").update(resetToken).digest("hex");

  user.otpHash     = resetTokenHashed;
  user.otpExpiry   = new Date(Date.now() + 15 * 60 * 1000);
  user.otpAttempts = 0;
  await user.save();

  sendSuccess(res, { resetToken }, "OTP verified. Use the reset token to set a new password.");
}

// ─── Forgot password — Step 3: Reset password ────────────────────────────────
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { resetToken, newPassword } = req.body as { resetToken: string; newPassword: string };
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

  const user = await User.findOne({
    otpHash: tokenHash, otpExpiry: { $gt: new Date() },
  }).select("+otpHash +otpExpiry");

  if (!user) { sendError(res, "Reset token is invalid or expired.", 400); return; }

  user.password = newPassword;
  user.otpHash = undefined; user.otpExpiry = undefined; user.otpAttempts = 0;
  user.loginAttempts = 0; user.lockUntil = undefined;
  await user.save();

  res.clearCookie("accessToken"); res.clearCookie("refreshToken");
  sendSuccess(res, null, "Password reset successfully. Please login with your new password.");
}

// ─── Change password (authenticated) ─────────────────────────────────────────
export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user?.userId).select("+password");
  if (!user) { sendError(res, "User not found", 404); return; }

  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) { sendError(res, "Current password is incorrect", 401); return; }

  user.password = newPassword;
  await user.save();
  res.clearCookie("accessToken"); res.clearCookie("refreshToken");
  sendSuccess(res, null, "Password changed. Please login again.");
}

// ─── Refresh token ────────────────────────────────────────────────────────────
export async function refreshToken(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) { sendError(res, "Refresh token missing", 401); return; }

  try {
    const payload = verifyRefreshToken(token);
    const user    = await User.findById(payload.userId);
    if (!user || !user.isActive) throw new Error("User not found");

    const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role });
    res.cookie("accessToken", accessToken, { ...COOKIE_OPTS, maxAge: 8 * 60 * 60 * 1000 });
    sendSuccess(res, null, "Token refreshed");
  } catch {
    res.clearCookie("accessToken"); res.clearCookie("refreshToken");
    sendError(res, "Session expired. Please login again.", 401);
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export function logout(_req: Request, res: Response): void {
  res.clearCookie("accessToken",  COOKIE_OPTS);
  res.clearCookie("refreshToken", COOKIE_OPTS);
  sendSuccess(res, null, "Logged out successfully");
}

// ─── Get current user ─────────────────────────────────────────────────────────
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findById(req.user?.userId);
  if (!user) { sendError(res, "User not found", 404); return; }
  sendSuccess(res, { user });
}
