import mongoose, { Schema } from "mongoose";

export interface IPatient {
  _id:                mongoose.Types.ObjectId;
  patientId:          string;       // human-readable e.g. "P-1001"
  name:               string;
  empId:              string;
  company:            string;
  age:                number;
  gender:             "Male" | "Female" | "Other";
  bloodGroup:         string;
  address:            string;
  designation:        string;
  identificationMark: string;
  createdBy:          mongoose.Types.ObjectId;  // ref: User
  createdAt:          Date;
  updatedAt:          Date;
}

const patientSchema = new Schema<IPatient>(
  {
    patientId:          { type: String, required: true, trim: true },
    name:               { type: String, required: true, trim: true, maxlength: 200 },
    empId:              { type: String, required: true, trim: true, maxlength: 50 },
    company:            { type: String, required: true, trim: true, maxlength: 200 },
    age:                { type: Number, required: true, min: 1, max: 120 },
    gender:             { type: String, enum: ["Male", "Female", "Other"], required: true },
    bloodGroup:         { type: String, required: true, trim: true },
    address:            { type: String, trim: true, default: "" },
    designation:        { type: String, trim: true, default: "" },
    identificationMark: { type: String, trim: true, default: "" },
    createdBy:          { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
patientSchema.index({ patientId: 1 }, { unique: true });
patientSchema.index({ empId: 1 });
patientSchema.index({ name: "text", empId: "text", company: "text" });

export const Patient = mongoose.model<IPatient>("Patient", patientSchema);
