import { Router } from "express";
import { exportExcel, exportCertificate } from "../controllers/export.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { exportLimiter } from "../middleware/rateLimiter.middleware.js";

const router = Router();

router.use(authenticate);
router.use(exportLimiter);

router.get("/excel",                    exportExcel);
router.get("/certificate/:reportId",    exportCertificate);

export default router;
