import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { createReview } from "./review.controller.js";
import { createReviewSchema } from "./review.schema.js";

export const reviewRouter = Router();

reviewRouter.use(
  authenticate,
  authorizeRoles(UserRole.CUSTOMER),
);

reviewRouter.post(
  "/",
  validateRequest(createReviewSchema),
  createReview,
);