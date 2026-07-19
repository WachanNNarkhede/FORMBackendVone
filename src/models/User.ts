import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser {
  _id:              mongoose.Types.ObjectId;
  name:             string;
  email:            string;
  phone:            string;        // Indian mobile: 10 digits
  password:         string;
  role:             "doctor" | "admin";
  qualification:    string;
  registrationNo:   string;
  clinicName:       string;
  isActive:         boolean;
  lastLogin?:       Date;
  loginAttempts:    number;
  lockUntil?:       Date;
  // OTP fields (for forgot password)
  otpHash?:         string;        // bcrypt hash of the OTP
  otpExpiry?:       Date;
  otpAttempts:      number;        // failed verify attempts per OTP
  createdAt:        Date;
  updatedAt:        Date;
  // Methods
  comparePassword(candidate: string): Promise<boolean>;
  isLocked(): boolean;
}

const userSchema = new Schema<IUser>(
  {
    name:           { type: String, required: true, trim: true, maxlength: 100 },
    email:          {
      type:      String,
      required:  true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    phone:          {
      type:     String,
      required: true,
      trim:     true,
      match:    [/^[6-9]\d{9}$/, "Invalid Indian mobile number"],
    },
    password:       { type: String, required: true, minlength: 8, select: false },
    role:           { type: String, enum: ["doctor", "admin"], default: "doctor" },
    qualification:  { type: String, trim: true, default: "" },
    registrationNo: { type: String, trim: true, default: "" },
    clinicName:     { type: String, trim: true, default: "Navodaya Clinic" },
    isActive:       { type: Boolean, default: true },
    lastLogin:      { type: Date },
    // Brute-force protection
    loginAttempts:  { type: Number, default: 0 },
    lockUntil:      { type: Date },
    // OTP for password reset
    otpHash:        { type: String, select: false },
    otpExpiry:      { type: Date,   select: false },
    otpAttempts:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 });

// ─── Pre-save: hash password ──────────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Instance methods ─────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Never return sensitive fields in JSON responses
userSchema.set("toJSON", {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(_doc, ret: any) {
    ret.password      = undefined;
    ret.loginAttempts = undefined;
    ret.lockUntil     = undefined;
    ret.otpHash       = undefined;
    ret.otpExpiry     = undefined;
    ret.otpAttempts   = undefined;
    return ret;
  },
});

export const User = mongoose.model<IUser>("User", userSchema);
