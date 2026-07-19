import { Router } from "express";
import {
  getReports, getReport, getSummary,
  createReport, updateReport, updateReportStatus, deleteReport,
} from "../controllers/report.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createReportSchema, updateReportSchema } from "../validators/report.validator.js";

const router = Router();

router.use(authenticate);

router.get( "/",        getReports);
router.get( "/summary", getSummary);
router.post("/",        validate(createReportSchema), createReport);
router.get( "/:id",     getReport);
router.put( "/:id",     requireAdmin, validate(updateReportSchema), updateReport);
router.patch("/:id/status",                           updateReportStatus);
router.delete("/:id",   requireAdmin,                 deleteReport);

export default router;
