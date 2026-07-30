import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
  cancelBooking,
  createBooking,
  customerBookingDetails,
  listCustomerBookings,
  listTechnicianBookings,
  technicianBookingDetails,
  updateTechnicianBooking,
} from "./booking.controller.js";
import {
  bookingDetailsSchema,
  cancelBookingSchema,
  createBookingSchema,
  listBookingsSchema,
  updateBookingStatusSchema,
} from "./booking.schema.js";

export const customerBookingRouter = Router();
export const technicianBookingRouter = Router();

customerBookingRouter.use(
  authenticate,
  authorizeRoles(UserRole.CUSTOMER),
);

customerBookingRouter.post(
  "/",
  validateRequest(createBookingSchema),
  createBooking,
);

customerBookingRouter.get(
  "/",
  validateRequest(listBookingsSchema),
  listCustomerBookings,
);

customerBookingRouter.get(
  "/:id",
  validateRequest(bookingDetailsSchema),
  customerBookingDetails,
);

customerBookingRouter.patch(
  "/:id/cancel",
  validateRequest(cancelBookingSchema),
  cancelBooking,
);

technicianBookingRouter.use(
  authenticate,
  authorizeRoles(UserRole.TECHNICIAN),
);

technicianBookingRouter.get(
  "/",
  validateRequest(listBookingsSchema),
  listTechnicianBookings,
);

technicianBookingRouter.get(
  "/:id",
  validateRequest(bookingDetailsSchema),
  technicianBookingDetails,
);

technicianBookingRouter.patch(
  "/:id",
  validateRequest(updateBookingStatusSchema),
  updateTechnicianBooking,
);