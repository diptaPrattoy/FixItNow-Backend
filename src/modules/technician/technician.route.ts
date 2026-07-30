import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
  createAvailability,
  createService,
  deleteAvailability,
  deleteService,
  getProfile,
  listAvailability,
  listServices,
  updateAvailability,
  updateProfile,
  updateService,
} from "./technician.controller.js";
import {
  availabilityListSchema,
  availabilityParamsSchema,
  createAvailabilitySchema,
  createServiceSchema,
  serviceParamsSchema,
  updateAvailabilitySchema,
  updateServiceSchema,
  updateTechnicianProfileSchema,
} from "./technician.schema.js";

export const technicianRouter = Router();

technicianRouter.use(
  authenticate,
  authorizeRoles(UserRole.TECHNICIAN),
);

technicianRouter.get("/profile", getProfile);

technicianRouter.put(
  "/profile",
  validateRequest(updateTechnicianProfileSchema),
  updateProfile,
);

technicianRouter.get("/services", listServices);

technicianRouter.post(
  "/services",
  validateRequest(createServiceSchema),
  createService,
);

technicianRouter.patch(
  "/services/:id",
  validateRequest(updateServiceSchema),
  updateService,
);

technicianRouter.delete(
  "/services/:id",
  validateRequest(serviceParamsSchema),
  deleteService,
);

technicianRouter.get(
  "/availability",
  validateRequest(availabilityListSchema),
  listAvailability,
);

technicianRouter.post(
  "/availability",
  validateRequest(createAvailabilitySchema),
  createAvailability,
);

technicianRouter.patch(
  "/availability/:id",
  validateRequest(updateAvailabilitySchema),
  updateAvailability,
);

technicianRouter.delete(
  "/availability/:id",
  validateRequest(availabilityParamsSchema),
  deleteAvailability,
);