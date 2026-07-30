import { z } from "zod";

const bookingStatusSchema = z.enum([
  "REQUESTED",
  "ACCEPTED",
  "DECLINED",
  "CANCELLED",
  "PAID",
  "IN_PROGRESS",
  "COMPLETED",
]);

const bookingParamsSchema = z.object({
  id: z.string().uuid("Booking ID must be a valid UUID"),
});

const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .default(1),

  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(50, "Limit must not exceed 50")
    .default(10),

  status: bookingStatusSchema.optional(),
});

const createBookingBodySchema = z.object({
  serviceId: z.string().uuid("Service ID must be a valid UUID"),

  availabilitySlotId: z
    .string()
    .uuid("Availability slot ID must be a valid UUID"),

  address: z
    .string()
    .trim()
    .min(5, "Address must contain at least 5 characters")
    .max(255, "Address must not exceed 255 characters"),

  notes: z
    .string()
    .trim()
    .max(1000, "Notes must not exceed 1000 characters")
    .nullable()
    .optional(),
});

const cancelBookingBodySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Cancellation reason must contain at least 3 characters")
    .max(500, "Cancellation reason must not exceed 500 characters"),
});

const technicianUpdateBodySchema = z
  .object({
    status: z.enum([
      "ACCEPTED",
      "DECLINED",
      "IN_PROGRESS",
      "COMPLETED",
    ]),

    declineReason: z
      .string()
      .trim()
      .min(3, "Decline reason must contain at least 3 characters")
      .max(500, "Decline reason must not exceed 500 characters")
      .optional(),
  })
  .superRefine((data, context) => {
    if (data.status === "DECLINED" && !data.declineReason) {
      context.addIssue({
        code: "custom",
        path: ["declineReason"],
        message: "Decline reason is required",
      });
    }
  });

export const createBookingSchema = z.object({
  body: createBookingBodySchema,
});

export const listBookingsSchema = z.object({
  query: paginationQuerySchema,
});

export const bookingDetailsSchema = z.object({
  params: bookingParamsSchema,
});

export const cancelBookingSchema = z.object({
  params: bookingParamsSchema,
  body: cancelBookingBodySchema,
});

export const updateBookingStatusSchema = z.object({
  params: bookingParamsSchema,
  body: technicianUpdateBodySchema,
});

export type CreateBookingInput = z.infer<
  typeof createBookingBodySchema
>;

export type BookingListQuery = z.infer<
  typeof paginationQuerySchema
>;

export type BookingParams = z.infer<
  typeof bookingParamsSchema
>;

export type CancelBookingInput = z.infer<
  typeof cancelBookingBodySchema
>;

export type TechnicianBookingUpdateInput = z.infer<
  typeof technicianUpdateBodySchema
>;