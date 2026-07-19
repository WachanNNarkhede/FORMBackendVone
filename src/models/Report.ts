import mongoose, { Schema } from "mongoose";

// ─── Plain TypeScript interfaces (used for typing) ────────────────────────────
export interface IVitals {
  pulseRate:        number;
  bpSystolic:       number;
  bpDiastolic:      number;
  heightMetres:     number;
  weightKg:         number;
  chestInflationCm: number;
  bmi:              number;
  temperatureF:     number;
  spo2Percent:      number;
}

export interface IEye {
  distantVisionRight: string;
  distantVisionLeft:  string;
  nightBlindness:     string;
  colourVision:       string;
}

export interface IExamination {
  pallor:                  string;
  lymphadenopathy:         string;
  respiratorySystem:       string;
  heart:                   string;
  abdomen:                 string;
  cns:                     string;
  physicalHandicapped:     string;
  eye:                     IEye;
  hearingAbility:          string;
  communicableDisease:     string;
  communicableDiseaseDesc: string;
  covid19Symptoms:         string;
  remarks:                 string;
}

export interface IDoctor {
  name:               string;
  qualification:      string;
  registrationNumber: string;
}

// ─── Main Report interface ────────────────────────────────────────────────────
export interface IReport {
  _id:         mongoose.Types.ObjectId;
  reportId:    string;
  patientId:   mongoose.Types.ObjectId;
  sNo:         number;
  date:        string;
  vitals:      IVitals;
  examination: IExamination;
  doctor:      IDoctor;
  status:      "draft" | "submitted" | "certified";
  createdBy:   mongoose.Types.ObjectId;
  updatedBy?:  mongoose.Types.ObjectId;
  createdAt:   Date;
  updatedAt:   Date;
}

// ─── Mongoose sub-schemas (for DB structure only) ─────────────────────────────
const VitalsSchema = new Schema<IVitals>(
  {
    pulseRate:        { type: Number, required: true },
    bpSystolic:       { type: Number, required: true },
    bpDiastolic:      { type: Number, required: true },
    heightMetres:     { type: Number, required: true },
    weightKg:         { type: Number, required: true },
    chestInflationCm: { type: Number, default: 0 },
    bmi:              { type: Number, required: true },
    temperatureF:     { type: Number, required: true },
    spo2Percent:      { type: Number, required: true },
  },
  { _id: false }
);

const EyeSchema = new Schema<IEye>(
  {
    distantVisionRight: { type: String, default: "6/6" },
    distantVisionLeft:  { type: String, default: "6/6" },
    nightBlindness:     { type: String, default: "No Any Complaint" },
    colourVision:       { type: String, default: "Normal" },
  },
  { _id: false }
);

const ExaminationSchema = new Schema<IExamination>(
  {
    pallor:                  { type: String, default: "Not Observed" },
    lymphadenopathy:         { type: String, default: "No Any Lymphadenopathy" },
    respiratorySystem:       { type: String, default: "Air Entry Equal On Both Sides, No Added Sounds" },
    heart:                   { type: String, default: "S1,S2 Normal, No Murmur" },
    abdomen:                 { type: String, default: "Soft Nontender" },
    cns:                     { type: String, default: "No Abnormality Detected" },
    physicalHandicapped:     { type: String, default: "No" },
    eye:                     { type: EyeSchema, default: () => ({}) },
    hearingAbility:          { type: String, default: "Present" },
    communicableDisease:     { type: String, enum: ["Yes", "No"], default: "No" },
    communicableDiseaseDesc: { type: String, default: "" },
    covid19Symptoms:         { type: String, enum: ["Yes", "No"], default: "No" },
    remarks:                 { type: String, default: "Nil" },
  },
  { _id: false }
);

const DoctorSchema = new Schema<IDoctor>(
  {
    name:               { type: String, required: true },
    qualification:      { type: String, default: "M.B.B.S." },
    registrationNumber: { type: String, required: true },
  },
  { _id: false }
);

// ─── Main Report Schema ───────────────────────────────────────────────────────
const reportSchema = new Schema<IReport>(
  {
    reportId:    { type: String, required: true, trim: true },
    patientId:   { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    sNo:         { type: Number, required: true },
    date:        { type: String, required: true },
    vitals:      { type: VitalsSchema,      required: true },
    examination: { type: ExaminationSchema, required: true },
    doctor:      { type: DoctorSchema,      required: true },
    status:      { type: String, enum: ["draft", "submitted", "certified"], default: "submitted" },
    createdBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy:   { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
reportSchema.index({ reportId: 1 }, { unique: true });
reportSchema.index({ patientId: 1, createdAt: -1 });
reportSchema.index({ status: 1 });

export const Report = mongoose.model<IReport>("Report", reportSchema);
