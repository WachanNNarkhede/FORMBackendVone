import { z } from "zod";

export const registerSchema = z.object({
  name:           z.string().min(2).max(100).trim(),
  email:          z.string().email().toLowerCase().trim(),
  phone:          z.string().trim().regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number").optional(),
  password:       z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
  qualification:  z.string().max(50).trim().optional(),
  registrationNo: z.string().max(50).trim().optional(),
  clinicName:     z.string().max(100).trim().optional(),
});

export const loginSchema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

// Forgot password — user enters their registered email
export const forgotPasswordSchema = z.object({
  email: z.string().email("Must be a valid email address").toLowerCase().trim(),
});

// Verify OTP — email + 6-digit code
export const verifyOtpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  otp:   z.string().trim().length(6, "OTP must be exactly 6 digits").regex(/^\d{6}$/, "OTP must contain only digits"),
});

// Reset password — short-lived token + new password
export const resetPasswordSchema = z.object({
  resetToken:  z.string().min(1, "Reset token is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
});

export type RegisterInput        = z.infer<typeof registerSchema>;
export type LoginInput           = z.infer<typeof loginSchema>;
export type ForgotPasswordInput  = z.infer<typeof forgotPasswordSchema>;
export type VerifyOtpInput       = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordInput   = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput  = z.infer<typeof changePasswordSchema>;
