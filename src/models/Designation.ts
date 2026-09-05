import mongoose, { Schema } from "mongoose";

// Custom designations typed by users, saved so they appear in the dropdown for everyone.
export interface IDesignation {
  value: string;
}

const designationSchema = new Schema<IDesignation>(
  {
    value: { type: String, required: true, trim: true, maxlength: 100, unique: true },
  },
  { timestamps: true }
);

export const Designation = mongoose.model<IDesignation>("Designation", designationSchema);
