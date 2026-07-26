import { Router } from "express";
import {
  listUsers, getUser, createUser,
  changeRole, changeStatus, deleteUser,
  getStats,
} from "../controllers/admin.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createUserSchema } from "../validators/auth.validator.js";

const router = Router();

// Every admin route requires a valid JWT AND admin role
router.use(authenticate);
router.use(requireAdmin);

router.get("/stats",          getStats);
router.get("/users",          listUsers);
router.post("/users",         validate(createUserSchema), createUser);
router.get("/users/:id",      getUser);
router.patch("/users/:id/role",   changeRole);
router.patch("/users/:id/status", changeStatus);
router.delete("/users/:id",   deleteUser);

export default router;
