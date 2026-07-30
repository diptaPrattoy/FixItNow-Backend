import { Router } from "express";

import { validateRequest } from "../../middlewares/validate-request.js";
import {
  listCategories,
  listServices,
  listTechnicians,
  technicianDetails,
} from "./public.controller.js";
import {
  listServicesSchema,
  listTechniciansSchema,
  technicianDetailsSchema,
} from "./public.schema.js";

export const publicRouter = Router();

publicRouter.get("/categories", listCategories);

publicRouter.get(
  "/services",
  validateRequest(listServicesSchema),
  listServices,
);

publicRouter.get(
  "/technicians",
  validateRequest(listTechniciansSchema),
  listTechnicians,
);

publicRouter.get(
  "/technicians/:id",
  validateRequest(technicianDetailsSchema),
  technicianDetails,
);