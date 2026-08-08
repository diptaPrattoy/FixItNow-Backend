import { Router } from "express";

import { validateRequest } from "../../middlewares/validate-request.js";
import { submitContactMessage } from "./contact.controller.js";
import { createContactSchema } from "./contact.schema.js";

export const contactRouter = Router();

contactRouter.post(
  "/",
  validateRequest(createContactSchema),
  submitContactMessage,
);