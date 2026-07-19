import { Patient } from "../models/Patient.js";
import { Report } from "../models/Report.js";

export async function generatePatientId(): Promise<string> {
  const last = await Patient.findOne().sort({ createdAt: -1 }).select("patientId");
  if (!last) return "P-1001";
  const num = parseInt(last.patientId.replace("P-", ""), 10);
  return `P-${num + 1}`;
}

export async function generateReportId(): Promise<string> {
  const last = await Report.findOne().sort({ createdAt: -1 }).select("reportId");
  if (!last) return "R-2001";
  const num = parseInt(last.reportId.replace("R-", ""), 10);
  return `R-${num + 1}`;
}

export async function generateSNo(): Promise<number> {
  const last = await Report.findOne().sort({ sNo: -1 }).select("sNo");
  return last ? last.sNo + 1 : 1001;
}
