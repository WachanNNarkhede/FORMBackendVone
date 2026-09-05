import { Router } from "express";
import { listDesignations, addDesignation } from "../controllers/designation.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/",  listDesignations);
router.post("/", addDesignation);

export default router;
