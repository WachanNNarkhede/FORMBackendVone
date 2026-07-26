import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../config/env.js";

let _transporter: Transporter | null = null;

/**
 * Returns a singleton Nodemailer transporter.
 *
 * Priority:
 *   1. Production + EMAIL_HOST configured → use real SMTP (Gmail / Resend / etc.)
 *   2. Development + no EMAIL_HOST        → auto-create Ethereal test account
 *      Ethereal captures emails in-browser — no real email sent, completely free.
 *      Preview URL is logged to the console after each send.
 */
async function getTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter;

  if (env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS) {
    // ── Real SMTP (Gmail, Resend, etc.) ──────────────────────────────────────
    try {
      const real = nodemailer.createTransport({
        host:   env.EMAIL_HOST,
        port:   env.EMAIL_PORT,
        secure: env.EMAIL_SECURE,          // true = port 465, false = STARTTLS
        auth: {
          user: env.EMAIL_USER,
          pass: env.EMAIL_PASS,            // Gmail: App Password (16 chars, no spaces)
        },
      });

      // Fail fast if the host/credentials are wrong
      await real.verify();
      _transporter = real;
      console.log(`📧  Email transport ready (${env.EMAIL_HOST})`);
      return _transporter;
    } catch (err) {
      // In production a broken SMTP config is fatal — surface it.
      if (env.IS_PROD) throw err;
      // In dev, don't block testing — fall back to Ethereal and warn loudly.
      console.warn(`⚠️  SMTP (${env.EMAIL_HOST}) unavailable — falling back to Ethereal for dev.`);
      console.warn(`    Reason: ${(err as Error).message}`);
    }
  }

  // ── Ethereal (dev/test — zero setup, emails visible in browser) ────────────
  const testAccount = await nodemailer.createTestAccount();
  _transporter = nodemailer.createTransport({
    host:   "smtp.ethereal.email",
    port:   587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  console.log("📧  Using Ethereal test email (dev mode — no real emails sent)");
  console.log(`    Open the preview URL logged after each send to read the OTP.`);

  return _transporter;
}

// ─── OTP email ─────────────────────────────────────────────────────────────
export async function sendOtpEmail(toEmail: string, otp: string): Promise<boolean> {
  try {
    const transport = await getTransporter();

    const info = await transport.sendMail({
      from:    env.EMAIL_FROM,
      to:      toEmail,
      subject: "Your MedFit password reset OTP",
      // Plain text fallback (important for deliverability)
      text: `
Your MedFit OTP is: ${otp}

This code is valid for 10 minutes.
Do not share this code with anyone.

If you did not request a password reset, please ignore this email.
      `.trim(),
      // HTML version
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
            <div style="width:36px;height:36px;border-radius:8px;background:#1D4E9C;
                        display:flex;align-items:center;justify-content:center">
              <span style="color:#fff;font-size:18px">⚕</span>
            </div>
            <span style="font-size:18px;font-weight:600;color:#111827">MedFit</span>
          </div>

          <h1 style="font-size:16px;font-weight:600;color:#111827;margin:0 0 8px">
            Password reset OTP
          </h1>
          <p style="font-size:14px;color:#6B7280;margin:0 0 24px">
            Use the code below to reset your password. It expires in <strong>10 minutes</strong>.
          </p>

          <div style="background:#F4F6FA;border-radius:12px;padding:20px;text-align:center;
                      margin-bottom:24px">
            <span style="font-size:36px;font-weight:700;letter-spacing:0.3em;
                         color:#1D4E9C;font-variant-numeric:tabular-nums">
              ${otp}
            </span>
          </div>

          <p style="font-size:13px;color:#9CA3AF;margin:0">
            If you didn't request a password reset, you can safely ignore this email.
            Your password won't change.
          </p>

          <hr style="border:none;border-top:1px solid #F0F3F8;margin:24px 0"/>
          <p style="font-size:11px;color:#9CA3AF;margin:0">
            MedFit · Medical Fitness Certificate System
          </p>
        </div>
      `,
    });

    // In dev: log the Ethereal preview URL so you can view the email
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`\n📧  OTP email preview: ${previewUrl}\n`);
    }

    return true;
  } catch (err) {
    console.error("Email send failed:", err);
    return false;
  }
}
