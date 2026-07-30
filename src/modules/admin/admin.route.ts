import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
  createCategory,
  listBookings,
  listCategories,
  listUsers,
  updateCategory,
  updateUserStatus,
} from "./admin.controller.js";
import {
  createCategorySchema,
  listAdminBookingsSchema,
  listAdminUsersSchema,
  updateCategorySchema,
  updateUserStatusSchema,
} from "./admin.schema.js";

export const adminRouter = Router();

adminRouter.use(
  authenticate,
  authorizeRoles(UserRole.ADMIN),
);

adminRouter.get(
  "/users",
  validateRequest(listAdminUsersSchema),
  listUsers,
);

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