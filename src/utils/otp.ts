import crypto from "crypto";
import bcrypt from "bcryptjs";

const OTP_LENGTH  = 6;
const OTP_EXPIRY  = 10 * 60 * 1000;   // 10 minutes
const MAX_ATTEMPTS = 3;                 // wrong OTP attempts before invalidation

/**
 * Generates a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt — NOT Math.random (predictable).
 */
export function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

/** Hash the OTP before storing in DB — same approach as passwords */
export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 8);   // 8 rounds — OTPs expire fast, lighter is fine
}

/** Constant-time comparison via bcrypt — prevents timing attacks */
export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

export function otpExpiry(): Date {
  return new Date(Date.now() + OTP_EXPIRY);
}

export function isOtpExpired(expiry: Date): boolean {
  return expiry < new Date();
}

export { MAX_ATTEMPTS };
