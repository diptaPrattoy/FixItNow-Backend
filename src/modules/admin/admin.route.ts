import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
  createCategory,
  listBookings,
  listCategories,
  listContactMessages,
  listUsers,
  readContactMessage,
  updateCategory,
  updateUserStatus,
  createAdmin,
  listAdmins,
} from "./admin.controller.js";

import {
  createAdminSchema,
  createCategorySchema,
  listAdminBookingsSchema,
  listAdminUsersSchema,
  listAdminsSchema,
  updateCategorySchema,
  updateUserStatusSchema,
} from "./admin.schema.js";

export const adminRouter = Router();

adminRouter.use(authenticate, authorizeRoles(UserRole.ADMIN));

/* =========================
   ADMIN MANAGEMENT
========================= */

adminRouter.get("/admins", validateRequest(listAdminsSchema), listAdmins);

adminRouter.post("/admins", validateRequest(createAdminSchema), createAdmin);

adminRouter.get("/users", validateRequest(listAdminUsersSchema), listUsers);

adminRouter.patch(
  "/users/:id",
  validateRequest(updateUserStatusSchema),
  updateUserStatus,
);

adminRouter.get(
  "/bookings",
  validateRequest(listAdminBookingsSchema),
  listBookings,
);

adminRouter.get("/categories", listCategories);

adminRouter.post(
  "/categories",
  validateRequest(createCategorySchema),
  createCategory,
);

adminRouter.patch(
  "/categories/:id",
  validateRequest(updateCategorySchema),
  updateCategory,
);

adminRouter.get("/contact-messages", listContactMessages);

adminRouter.patch("/contact-messages/:id/read", readContactMessage);
