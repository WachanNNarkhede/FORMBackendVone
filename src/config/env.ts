import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT:                   z.string().default("5000"),
  NODE_ENV:               z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI:            z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET:             z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  JWT_EXPIRES_IN:         z.string().default("8h"),
  JWT_REFRESH_SECRET:     z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  FRONTEND_URL:           z.string().url("FRONTEND_URL must be a valid URL"),
  COOKIE_SECURE:          z.string().default("false"),
  // Email — all optional; app falls back to Ethereal in dev if missing
  EMAIL_HOST:             z.string().optional(),
  EMAIL_PORT:             z.string().default("587"),
  EMAIL_SECURE:           z.string().default("false"),
  EMAIL_USER:             z.string().optional(),
  EMAIL_PASS:             z.string().optional(),
  EMAIL_FROM:             z.string().default("MedFit Clinic <noreply@medfit.local>"),
  // Clinic letterhead (printed on PDF certificates)
  CLINIC_NAME:            z.string().default("NAVODAYA CLINIC"),
  CLINIC_TAGLINE:         z.string().default("Seamless Care"),
  CLINIC_ADDRESS:         z.string().default("Shiv Lane, Next to Prakash Furniture, Rahatani."),
  CLINIC_PHONE:           z.string().default("8451044222"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const IS_PROD = parsed.data.NODE_ENV === "production";

// ── Production safety checks — refuse to boot with insecure secrets ───────────
if (IS_PROD) {
  const weak = [
    "qwertyuiopasdfghjklpoiuytrewqbhu",
    "qwertyuiopasdfghjklpoiuytrewqasd",
    "changeme", "secret", "your-secret",
  ];
  const problems: string[] = [];
  if (weak.includes(parsed.data.JWT_SECRET))         problems.push("JWT_SECRET is a known weak/default value");
  if (weak.includes(parsed.data.JWT_REFRESH_SECRET)) problems.push("JWT_REFRESH_SECRET is a known weak/default value");
  if (parsed.data.JWT_SECRET === parsed.data.JWT_REFRESH_SECRET) problems.push("JWT_SECRET and JWT_REFRESH_SECRET must differ");
  if (parsed.data.COOKIE_SECURE !== "true")          problems.push("COOKIE_SECURE must be 'true' in production (HTTPS-only cookies)");
  if (problems.length) {
    console.error("❌  Refusing to start in production — insecure configuration:");
    problems.forEach((p) => console.error(`   • ${p}`));
    console.error("   Generate secrets with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"");
    process.exit(1);
  }
}

export const env = {
  ...parsed.data,
  PORT:          parseInt(parsed.data.PORT, 10),
  EMAIL_PORT:    parseInt(parsed.data.EMAIL_PORT, 10),
  // Always send Secure cookies in production, even if the env var was left unset
  COOKIE_SECURE: parsed.data.COOKIE_SECURE === "true" || IS_PROD,
  EMAIL_SECURE:  parsed.data.EMAIL_SECURE === "true",
  IS_PROD,
} as const;
