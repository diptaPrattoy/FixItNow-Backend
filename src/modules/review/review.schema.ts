import { z } from "zod";

const createReviewBodySchema = z.object({
  bookingId: z.string().uuid("Booking ID must be a valid UUID"),

  rating: z.coerce
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must not exceed 5"),

  comment: z
    .string()
    .trim()
    .max(1000, "Comment must not exceed 1000 characters")
    .nullable()
    .optional(),
});

export const createReviewSchema = z.object({
  body: createReviewBodySchema,
});

export type CreateReviewInput = z.infer<
  typeof createReviewBodySchema
>;