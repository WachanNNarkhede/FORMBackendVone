import type { Response } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Report } from "../models/Report.js";
import { Patient } from "../models/Patient.js";
import { sendError } from "../utils/response.js";
import { env } from "../config/env.js";
import type { AuthRequest } from "../types/index.js";

// ─── Excel certificate-form helpers ──────────────────────────────────────────
type CellOpts = {
  bold?:      boolean;
  size?:      number;
  h?:         "left" | "center" | "right";
  v?:         "top" | "middle" | "bottom";
  wrap?:      boolean;
  underline?: boolean;
  color?:     string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function put(ws: ExcelJS.Worksheet, range: string, value: any, opts: CellOpts = {}): ExcelJS.Cell {
  if (range.includes(":")) ws.mergeCells(range);
  const addr = range.split(":")[0];
  const cell = ws.getCell(addr);
  cell.value = value;
  cell.font = {
    name:      "Calibri",
    size:      opts.size ?? 10,
    bold:      opts.bold,
    underline: opts.underline,
    color:     opts.color ? { argb: opts.color } : undefined,
  };
  cell.alignment = {
    vertical:   opts.v ?? "middle",
    horizontal: opts.h ?? "left",
    wrapText:   opts.wrap ?? true,
  };
  return cell;
}

const BRAND = "FF1D4E9C";

// Renders ONE report as a fitness-certificate form on its own worksheet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCertificateSheet(ws: ExcelJS.Worksheet, r: any, patient: any): void {
  const v = r.vitals ?? {};
  const e = r.examination ?? {};
  const eye = e.eye ?? {};
  const d = r.doctor ?? {};

  // Column widths (6 columns)
  const widths = [22, 13, 13, 18, 13, 14];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // Row 1 — S.NO. (top-right, no border)
  put(ws, "E1", "S.NO.", { bold: true, h: "right" });
  put(ws, "F1", r.sNo ?? "", { bold: true, h: "left", color: "FFC00000" });

  // Row 2 — Title
  put(ws, "A2:F2", "MEDICAL FITNESS CERTIFICATE FOR SECURITY GUARDS/ SUPERVISOR",
      { bold: true, underline: true, h: "center", size: 11 });

  // Rows 3–7 — patient / employee details
  put(ws, "A3", "Company Name:");            put(ws, "B3:C3", patient.company ?? "");
  put(ws, "D3", "Employee id no:");          put(ws, "E3:F3", patient.empId ?? "");

  put(ws, "A4", "Employee Name:");           put(ws, "B4:C4", patient.name ?? "");
  put(ws, "D4", "Date:");                    put(ws, "E4:F4", r.date ?? "", { color: "FFC00000" });

  put(ws, "A5", "Age:");                     put(ws, "B5", patient.age != null ? `${patient.age}  Years` : "Years");
  put(ws, "C5", "Gender:");                  put(ws, "D5", patient.gender ?? "");
  put(ws, "E5", "Blood Group:");             put(ws, "F5", patient.bloodGroup ?? "");

  put(ws, "A6", "Address:");                 put(ws, "B6:F6", patient.address ?? "");

  put(ws, "A7", "Designation:");             put(ws, "B7:C7", patient.designation ?? "");
  put(ws, "D7", "Identification Mark");      put(ws, "E7:F7", patient.identificationMark ?? "");

  // Row 8 — section header
  put(ws, "A8:F8", "GENERAL EXAMINATION", { bold: true, underline: true, h: "center" });

  // Rows 9–14 — vitals
  put(ws, "A9",  "Pulse rate:");  put(ws, "B9",  v.pulseRate ?? "");                          put(ws, "C9",  "/min");
  put(ws, "D9:F9", "");
  put(ws, "A10", "B.P.:");        put(ws, "B10", (v.bpSystolic != null && v.bpDiastolic != null) ? `${v.bpSystolic}/${v.bpDiastolic}` : ""); put(ws, "C10", "mmHg");
  put(ws, "D10:F10", "");
  put(ws, "A11", "Height:");      put(ws, "B11", v.heightMetres ?? "");                        put(ws, "C11", "metres");
  put(ws, "D11", "Chest Inflation:"); put(ws, "E11", v.chestInflationCm ?? "");                put(ws, "F11", "cm");
  put(ws, "A12", "Weight:");      put(ws, "B12", v.weightKg ?? "");                            put(ws, "C12", "kg");
  put(ws, "D12", "BMI:");         put(ws, "E12", v.bmi ?? "");                                 put(ws, "F12", "kg/sq.m");
  put(ws, "A13", "Temperature:"); put(ws, "B13", v.temperatureF ?? "");                        put(ws, "C13", "°F");
  put(ws, "D13:F13", "");
  put(ws, "A14", "SpO2:");        put(ws, "B14", v.spo2Percent ?? "");                          put(ws, "C14", "%");
  put(ws, "D14:F14", "");

  // Rows 15–21 — single-line examination findings
  put(ws, "A15", "Pallor/ Icterus:");        put(ws, "B15:F15", e.pallor ?? "");
  put(ws, "A16", "Lymphadenopathy:");        put(ws, "B16:F16", e.lymphadenopathy ?? "");
  put(ws, "A17", "Respiratory system:");     put(ws, "B17:F17", e.respiratorySystem ?? "");
  put(ws, "A18", "Heart:");                  put(ws, "B18:F18", e.heart ?? "");
  put(ws, "A19", "Abdomen:");                put(ws, "B19:F19", e.abdomen ?? "");
  put(ws, "A20", "Central Nervous system:"); put(ws, "B20:F20", e.cns ?? "");
  put(ws, "A21", "Physical Handicapped:");   put(ws, "B21:F21", e.physicalHandicapped ?? "");

  // Rows 22–24 — Eye + Ear
  put(ws, "A22:A23", "Eye:");
  put(ws, "B22", "A) Distant Vision:");      put(ws, "C22:F22", `Right: ${eye.distantVisionRight ?? "6/6"}     left: ${eye.distantVisionLeft ?? "6/6"}`);
  put(ws, "B23", "B) Night Blindness:");     put(ws, "C23:F23", eye.nightBlindness ?? "");
  put(ws, "A24", "(Ear) Basic hearing ability"); put(ws, "B24", e.hearingAbility ?? "");
  put(ws, "C24:F24", `C) Colour vision: ${eye.colourVision ?? "Normal"}`);

  // Rows 25–27 — communicable / covid
  put(ws, "A25:D25", "Is The Person Suspecting Any Communicable"); put(ws, "E25:F25", e.communicableDisease ?? "No");
  put(ws, "A26:D26", "Or Infectious Disease:");                    put(ws, "E26:F26", e.communicableDisease === "Yes" ? `If Yes: ${e.communicableDiseaseDesc ?? ""}` : "If Yes, description:");
  put(ws, "A27:E27", "Any sign and symptom of Cough, cold, fever & difficulty in breathing i.e. Covid-19:"); put(ws, "F27", e.covid19Symptoms ?? "No");

  // Row 28 — remarks
  put(ws, "A28:C28", "Remarks if any:"); put(ws, "D28:F28", e.remarks ?? "Nil", { bold: true });

  // Row 29 — Medical Fitness header
  put(ws, "A29:F29", "Medical Fitness", { bold: true, underline: true, h: "center" });

  // Rows 30–33 — certification paragraph
  const certify =
    `This Is To Certify That Mr/Mrs ${patient.name ?? ""}\n` +
    `Employeed at ${patient.company ?? ""} Has Been Carefully Examined By Me\n` +
    `On Date ${r.date ?? ""} Based On The Medical Examination Conducted,\n` +
    `Found Free From obvious Infectious Diseases & He/she is physically and mentally " FIT " in this organization.`;
  put(ws, "A30:F33", certify, { v: "top" });

  // Rows 34–37 — signature block (bottom-right)
  put(ws, "A34:F34", "");
  put(ws, "D35:F35", "Signature of Doctor:");
  put(ws, "D36:F36", `Name Of Doctor: ${d.name ?? ""}`);
  put(ws, "D37:F37", `Registration Number: ${d.registrationNumber ?? ""}`);

  // Row heights
  ws.getRow(2).height  = 24;
  [30, 31, 32, 33].forEach((n) => { ws.getRow(n).height = 16; });
  ws.getRow(34).height = 18;

  // Borders across the whole form (rows 2–37, cols A–F)
  for (let row = 2; row <= 37; row++) {
    for (let col = 1; col <= 6; col++) {
      ws.getCell(row, col).border = {
        top:    { style: "thin", color: { argb: "FF808080" } },
        left:   { style: "thin", color: { argb: "FF808080" } },
        bottom: { style: "thin", color: { argb: "FF808080" } },
        right:  { style: "thin", color: { argb: "FF808080" } },
      };
    }
  }

  ws.pageSetup = { orientation: "portrait", fitToPage: true, margins: {
    left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3,
  } };
}

// ─── GET /export/excel?patientId=P-1001 or ?patientId=<mongoId> ──────────────
// Produces one workbook for the patient, with ONE certificate-form sheet per report.
export async function exportExcel(req: AuthRequest, res: Response): Promise<void> {
  const { patientId } = req.query as { patientId?: string };
  if (!patientId) { sendError(res, "patientId query param required", 400); return; }

  // Accept both human-readable patientId (P-1001) and MongoDB _id
  const patient = await Patient.findOne({
    $or: [{ patientId }, { _id: patientId.match(/^[a-f\d]{24}$/i) ? patientId : null }],
  }).lean();
  if (!patient) { sendError(res, "Patient not found", 404); return; }

  const reports = await Report.find({ patientId: patient._id })
    .sort({ createdAt: 1 })   // chronological — oldest sheet first
    .lean();

  if (reports.length === 0) {
    sendError(res, "No reports found for this patient", 404);
    return;
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "MedFit";
  wb.created = new Date();

  const usedNames = new Set<string>();
  reports.forEach((r) => {
    // Sheet name must be unique & ≤ 31 chars, no special chars
    let name = `S.No ${r.sNo ?? r.reportId}`.replace(/[\\/?*[\]:]/g, "").slice(0, 31);
    while (usedNames.has(name)) name = `${name}_`.slice(0, 31);
    usedNames.add(name);
    const ws = wb.addWorksheet(name);
    renderCertificateSheet(ws, r, patient);
  });

  const filename = `${patient.patientId}-certificates-${new Date().toISOString().split("T")[0]}.xlsx`;
  res.setHeader("Content-Type",        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  await wb.xlsx.write(res);
  res.end();
}

// ─── GET /export/certificate/:reportId ───────────────────────────────────────
// Generates one PDF fitness certificate for a single report, containing every
// field captured in the form plus all unique IDs. One certificate per report.
export async function exportCertificate(req: AuthRequest, res: Response): Promise<void> {
  const report = await Report.findOne({ reportId: req.params.reportId })
    .populate("patientId")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .lean() as any;

  if (!report) { sendError(res, "Report not found", 404); return; }

  const patient = report.patientId ?? {};
  const v = report.vitals ?? {};
  const e = report.examination ?? {};
  const eye = e.eye ?? {};
  const d = report.doctor ?? {};

  const CLINIC = {
    name:    env.CLINIC_NAME,
    tagline: env.CLINIC_TAGLINE,
    address: env.CLINIC_ADDRESS,
    phone:   env.CLINIC_PHONE,
  };

  // ── HTTP headers ─────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${report.reportId}-certificate.pdf"`
  );

  // ── Build PDF (full-width bordered form matching the clinic template) ──────
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  doc.pipe(res);

  const BRAND = "#1D4E9C", GREY = "#555555";
  const LEFT = 40, RIGHT = 555, W = RIGHT - LEFT;
  const QUOTE = String.fromCharCode(34);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const str = (x: any) => (x == null ? "" : String(x));

  // ── Letterhead ─────────────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#111").text(str(d.name) || "Doctor", LEFT, 30);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#333").text(str(d.qualification) || "M.B.B.S.", LEFT, 49);
  doc.text(`Reg. No. ${str(d.registrationNumber) || "—"}`, LEFT, 61);
  doc.font("Helvetica-Bold").fontSize(24).fillColor(BRAND).text(CLINIC.name, 285, 28, { width: 270, align: "right" });
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#222").text(CLINIC.tagline, 285, 56, { width: 270, align: "right" });
  doc.font("Helvetica").fontSize(11).fillColor("#111").text(`S.NO. ${str(report.sNo)}`, 285, 78, { width: 270, align: "right" });

  let y = 105;
  const rowH = 16;

  interface Cell { w: number; text?: string | number; bold?: boolean; align?: "left" | "center" | "right"; size?: number; color?: string; }
  const drawRow = (height: number, cells: Cell[]): void => {
    let x = LEFT;
    for (const c of cells) {
      doc.lineWidth(0.7).strokeColor(GREY).rect(x, y, c.w, height).stroke();
      if (c.text != null && c.text !== "") {
        const fs = c.size ?? 9;
        doc.font(c.bold ? "Helvetica-Bold" : "Helvetica").fontSize(fs).fillColor(c.color ?? "#000");
        doc.text(String(c.text), x + 4, y + (height - fs) / 2 - 1, { width: c.w - 8, align: c.align ?? "left", lineBreak: false });
      }
      x += c.w;
    }
    y += height;
  };
  const bandHeader = (text: string, height: number): void => {
    doc.lineWidth(0.7).strokeColor(GREY).rect(LEFT, y, W, height).stroke();
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#000")
       .text(text, LEFT, y + (height - 10) / 2 - 1, { width: W, align: "center", underline: true, lineBreak: false });
    y += height;
  };
  const rightCells = (height: number, startX: number, cells: Cell[]): void => {
    let x = startX;
    for (const c of cells) {
      doc.lineWidth(0.7).strokeColor(GREY).rect(x, y, c.w, height).stroke();
      if (c.text) {
        doc.font("Helvetica").fontSize(9).fillColor("#000")
           .text(String(c.text), x + 4, y + (height - 9) / 2 - 1, { width: c.w - 8, lineBreak: false });
      }
      x += c.w;
    }
    y += height;
  };

  bandHeader("MEDICAL FITNESS CERTIFICATE FOR SECURITY GUARDS/ SUPERVISORS", 20);
  drawRow(rowH, [{ w: 150, text: "Company Name:" }, { w: 210, text: str(patient.company) }, { w: 85, text: "Employee id no:" }, { w: 70, text: str(patient.empId) }]);
  drawRow(20, [{ w: 150, text: "Employee Name:" }, { w: 210, text: str(patient.name), bold: true, size: 12 }, { w: 85, text: "Date:" }, { w: 70, text: str(report.date), color: "#C00000" }]);
  drawRow(rowH, [{ w: 150, text: "Age:" }, { w: 40, text: str(patient.age) }, { w: 50, text: "Years" }, { w: 60, text: "Gender:" }, { w: 55, text: str(patient.gender) }, { w: 90, text: "Blood Group:" }, { w: 70, text: str(patient.bloodGroup) }]);
  drawRow(rowH, [{ w: 150, text: "Work Address:" }, { w: 365, text: str(patient.address) }]);
  // Designation row is taller and wraps the identification mark so long marks don't overflow
  {
    const h = 24;
    doc.lineWidth(0.7).strokeColor(GREY).rect(LEFT, y, 150, h).stroke();
    doc.lineWidth(0.7).rect(LEFT + 150, y, 140, h).stroke();
    doc.lineWidth(0.7).rect(LEFT + 290, y, 110, h).stroke();
    doc.lineWidth(0.7).rect(LEFT + 400, y, 115, h).stroke();
    doc.font("Helvetica").fontSize(9).fillColor("#000").text("Designation:", LEFT + 4, y + 7, { lineBreak: false });
    doc.text(str(patient.designation), LEFT + 154, y + 7, { width: 132, lineBreak: false });
    doc.text("Identification Mark:", LEFT + 294, y + 7, { width: 104, lineBreak: false });
    doc.fontSize(8).text(str(patient.identificationMark), LEFT + 404, y + 4, { width: 107 });
    y += h;
  }
  bandHeader("GENERAL EXAMINATION", 15);
  drawRow(rowH, [{ w: 150, text: "Pulse rate:" }, { w: 55, text: str(v.pulseRate), align: "center" }, { w: 60, text: "/min" }, { w: 250, text: "" }]);
  drawRow(rowH, [{ w: 150, text: "B.P." }, { w: 55, text: (v.bpSystolic != null ? `${v.bpSystolic}/${v.bpDiastolic}` : ""), align: "center" }, { w: 60, text: "mmHg" }, { w: 250, text: "" }]);
  drawRow(rowH, [{ w: 150, text: "Height:" }, { w: 55, text: str(v.heightMetres), align: "center" }, { w: 60, text: "metres" }, { w: 140, text: "Chest Inflation:" }, { w: 110, text: `${str(v.chestInflationCm)} cm` }]);
  drawRow(rowH, [{ w: 150, text: "Weight:" }, { w: 55, text: str(v.weightKg), align: "center" }, { w: 60, text: "kg" }, { w: 140, text: "BMI:" }, { w: 110, text: `${str(v.bmi)}  kg/sq.m` }]);
  drawRow(rowH, [{ w: 150, text: "Temperature:" }, { w: 55, text: str(v.temperatureF), align: "center" }, { w: 60, text: "°F" }, { w: 250, text: "" }]);
  drawRow(rowH, [{ w: 150, text: "SpO2:" }, { w: 55, text: str(v.spo2Percent), align: "center" }, { w: 60, text: "%" }, { w: 250, text: "" }]);
  drawRow(rowH, [{ w: 150, text: "Pallor/ Icterus:" }, { w: 365, text: str(e.pallor) }]);
  drawRow(rowH, [{ w: 150, text: "Lymphadenopathy:" }, { w: 365, text: str(e.lymphadenopathy) }]);
  drawRow(rowH, [{ w: 150, text: "Respiratory system:" }, { w: 365, text: str(e.respiratorySystem) }]);
  drawRow(rowH, [{ w: 150, text: "Heart:" }, { w: 365, text: str(e.heart) }]);
  drawRow(rowH, [{ w: 150, text: "Abdomen:" }, { w: 365, text: str(e.abdomen) }]);
  drawRow(rowH, [{ w: 150, text: "Central Nervous system:" }, { w: 365, text: str(e.cns) }]);
  drawRow(rowH, [{ w: 150, text: "Physical Handicapped:" }, { w: 365, text: str(e.physicalHandicapped) }]);
  // Eye — tall left cell spanning two rows
  const eyeTop = y;
  doc.lineWidth(0.7).strokeColor(GREY).rect(LEFT, eyeTop, 150, rowH * 2).stroke();
  doc.font("Helvetica").fontSize(9).fillColor("#000").text("Eye:", LEFT + 4, eyeTop + 4, { lineBreak: false });
  y = eyeTop;
  rightCells(rowH, LEFT + 150, [{ w: 140, text: "A) Distant Vision:" }, { w: 225, text: `Right: ${str(eye.distantVisionRight) || "6/6"}    left:${str(eye.distantVisionLeft) || "6/6"}` }]);
  rightCells(rowH, LEFT + 150, [{ w: 140, text: "B) Night Blindness:" }, { w: 225, text: str(eye.nightBlindness) }]);
  drawRow(rowH, [{ w: 190, text: "(Ear) Basic hearing ability:" }, { w: 100, text: str(e.hearingAbility) }, { w: 225, text: `C) Colour vision: ${str(eye.colourVision)}` }]);
  drawRow(rowH, [{ w: 410, text: "Is The Person Suspecting Any Communicable Or" }, { w: 105, text: str(e.communicableDisease) }]);
  drawRow(rowH, [{ w: 410, text: "Infectious Disease:" }, { w: 105, text: (e.communicableDisease === "Yes" && e.communicableDiseaseDesc) ? str(e.communicableDiseaseDesc) : "If Yes, description:", size: 8 }]);
  drawRow(rowH, [{ w: 445, text: "Any sign and symptom of Cough, cold, fever & difficulty in breathing i.e. Covid-19 :", size: 8.5 }, { w: 70, text: str(e.covid19Symptoms) }]);
  drawRow(14, [{ w: 515, text: "" }]);
  drawRow(rowH, [{ w: 150, text: "Remarks if any:" }, { w: 365, text: str(e.remarks) || "Nil", bold: true }]);
  bandHeader("Medical Fitness", 16);

  // Certification + signature block
  const cbTop = y, cbH = 118;
  doc.lineWidth(0.7).strokeColor(GREY).rect(LEFT, cbTop, W, cbH).stroke();
  let ty = cbTop + 10;
  doc.font("Helvetica").fontSize(9.5).fillColor("#000")
     .text("This Is To Certify That Mr/Mrs        ", LEFT + 30, ty, { continued: true })
     .font("Helvetica-Bold").text(str(patient.name));
  ty += 18; doc.font("Helvetica").fontSize(9.5).text(`Employeed at   ${str(patient.company)}   Has Been Carefully Examined By Me`, LEFT + 15, ty, { width: W - 30, lineBreak: false });
  ty += 15; doc.text(`On Date        ${str(report.date)}        Based On The Medical Examination Conducted, He/She is`, LEFT + 15, ty, { width: W - 30, lineBreak: false });
  ty += 15; doc.text(`Found Free From obvious Infectious Diseases & He/she is physically and mentally ${QUOTE} FIT ${QUOTE} to work`, LEFT + 15, ty, { width: W - 30, lineBreak: false });
  ty += 13; doc.text("in this organization.", LEFT + 15, ty, { lineBreak: false });

  const sx = 345, syb = cbTop + cbH - 38;
  doc.font("Helvetica").fontSize(9.5).fillColor("#000").text("Signature of Doctor:  ", sx, syb, { continued: true })
     .font("Helvetica-Bold").fillColor(BRAND).text(str(d.name));
  doc.font("Helvetica").fillColor("#000").text("Name Of Doctor:  ", sx, syb + 14, { continued: true })
     .font("Helvetica-Bold").fillColor("#333").text(str(d.qualification) || "M.B.B.S.");
  doc.font("Helvetica").fillColor("#000").text("Registration Number:  ", sx, syb + 28, { continued: true })
     .font("Helvetica-Bold").fillColor("#333").text(`Reg. No. ${str(d.registrationNumber)}`);

  // Disclaimer note
  y = cbTop + cbH + 8;
  doc.font("Helvetica-Oblique").fontSize(7.5).fillColor("#444")
     .text("Note: This Certificate Has Been Issued On Interest/Demand Of The Applicant For Issuing Medical Fitness. Not For Medicolegal Purpose.", LEFT, y, { width: W, align: "center" });

  // Blue footer bar
  const fbH = 26, fbY = doc.page.height - fbH;
  doc.rect(0, fbY, doc.page.width, fbH).fill(BRAND);
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#FFFFFF")
     .text(`${CLINIC.address}   |   Phone : ${CLINIC.phone}`, 0, fbY + (fbH - 9.5) / 2, { width: doc.page.width, align: "center" });

  doc.end();
}
