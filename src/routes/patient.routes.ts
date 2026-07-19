import { Router } from "express";
import {
  getPatients, getPatient, createPatient,
  updatePatient, deletePatient, getPatientReports,
} from "../controllers/patient.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createPatientSchema } from "../validators/report.validator.js";

const router = Router();

// All patient routes require authentication
router.use(authenticate);

router.get( "/",                    getPatients);
router.post("/",    validate(createPatientSchema), createPatient);
router.get( "/:id",                 getPatient);
router.put( "/:id", requireAdmin, validate(createPatientSchema.partial()), updatePatient);
router.delete("/:id", requireAdmin, deletePatient);
router.get( "/:id/reports",         getPatientReports);

export default router;
