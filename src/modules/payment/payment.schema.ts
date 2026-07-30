import { z } from "zod";

const paymentParamsSchema = z.object({
  id: z.string().uuid("Payment ID must be a valid UUID"),
});

const createPaymentBodySchema = z.object({
  bookingId: z.string().uuid("Booking ID must be a valid UUID"),

  city: z
    .string()
    .trim()
    .min(2, "City must contain at least 2 characters")
    .max(50, "City must not exceed 50 characters"),

  postcode: z
    .string()
    .trim()
    .min(3, "Postcode must contain at least 3 characters")
    .max(20, "Postcode must not exceed 20 characters"),
});

const paymentListQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10),

  status: z
    .enum([
      "PENDING",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
      "REFUNDED",
    ])
    .optional(),
});

export const createPaymentSchema = z.object({
  body: createPaymentBodySchema,
});

export const listPaymentsSchema = z.object({
  query: paymentListQuerySchema,
});

export const paymentDetailsSchema = z.object({
  params: paymentParamsSchema,
});

export type CreatePaymentInput = z.infer<
  typeof createPaymentBodySchema
>;

export type PaymentListQuery = z.infer<
  typeof paymentListQuerySchema
>;

export type PaymentParams = z.infer<
  typeof paymentParamsSchema
>;