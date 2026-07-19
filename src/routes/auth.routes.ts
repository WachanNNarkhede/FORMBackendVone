import { Router } from "express";
import {
  register, login,
  forgotPassword, verifyOtpAndGetResetToken, resetPassword,
  changePassword,
  refreshToken, logout, getMe,
} from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimiter.middleware.js";
import {
  registerSchema, loginSchema,
  forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema,
  changePasswordSchema,
} from "../validators/auth.validator.js";

const router = Router();

// ─── Public routes (strict rate limit) ───────────────────────────────────────
router.use(authLimiter);

router.post("/register",        validate(registerSchema),       register);
router.post("/login",           validate(loginSchema),           login);
router.post("/forgot-password", validate(forgotPasswordSchema),  forgotPassword);
router.post("/verify-otp",      validate(verifyOtpSchema),       verifyOtpAndGetResetToken);
router.post("/reset-password",  validate(resetPasswordSchema),   resetPassword);
router.post("/refresh",                                          refreshToken);
router.post("/logout",                                           logout);

// ─── Protected routes ─────────────────────────────────────────────────────────
router.get( "/me",              authenticate,                    getMe);
router.post("/change-password", authenticate, validate(changePasswordSchema), changePassword);

export default router;
