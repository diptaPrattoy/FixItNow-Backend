import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
  createPayment,
  listPayments,
  paymentCancelled,
  paymentDetails,
  paymentFailed,
  paymentIpn,
  paymentSuccess,
} from "./payment.controller.js";
import {
  createPaymentSchema,
  listPaymentsSchema,
  paymentDetailsSchema,
} from "./payment.schema.js";

export const paymentRouter = Router();

paymentRouter.post("/success", paymentSuccess);
paymentRouter.post("/fail", paymentFailed);
paymentRouter.post("/cancel", paymentCancelled);
paymentRouter.post("/ipn", paymentIpn);

paymentRouter.use(
  authenticate,
  authorizeRoles(UserRole.CUSTOMER),
);

paymentRouter.post(
  "/create",
  validateRequest(createPaymentSchema),
  createPayment,
);

paymentRouter.get(
  "/",
  validateRequest(listPaymentsSchema),
  listPayments,
);

paymentRouter.get(
  "/:id",
  validateRequest(paymentDetailsSchema),
  paymentDetails,
);