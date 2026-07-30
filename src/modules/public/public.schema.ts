import { z } from "zod";

const pageSchema = z.coerce
  .number()
  .int("Page must be an integer")
  .min(1, "Page must be at least 1")
  .default(1);

const limitSchema = z.coerce
  .number()
  .int("Limit must be an integer")
  .min(1, "Limit must be at least 1")
  .max(50, "Limit must not exceed 50")
  .default(10);

const optionalText = z
  .string()
  .trim()
  .min(1)
  .max(150)
  .optional();

const serviceQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    search: optionalText,
    category: optionalText,
    location: optionalText,
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    sortBy: z
      .enum([
        "newest",
        "price_asc",
        "price_desc",
        "rating_desc",
      ])
      .default("newest"),
  })
  .superRefine((query, context) => {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      context.addIssue({
        code: "custom",
        path: ["maxPrice"],
        message: "Maximum price must be greater than minimum price",
      });
    }
  });

const technicianQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    search: optionalText,
    category: optionalText,
    location: optionalText,
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    sortBy: z
      .enum([
        "rating_desc",
        "experience_desc",
        "newest",
      ])
      .default("rating_desc"),
  })
  .superRefine((query, context) => {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      context.addIssue({
        code: "custom",
        path: ["maxPrice"],
        message: "Maximum price must be greater than minimum price",
      });
    }
  });

const technicianParamsSchema = z.object({
  id: z.string().uuid("Technician ID must be a valid UUID"),
});

export const listServicesSchema = z.object({
  query: serviceQuerySchema,
});

export const listTechniciansSchema = z.object({
  query: technicianQuerySchema,
});

export const technicianDetailsSchema = z.object({
  params: technicianParamsSchema,
});

export type ServiceQuery = z.infer<typeof serviceQuerySchema>;
export type TechnicianQuery = z.infer<typeof technicianQuerySchema>;
export type TechnicianParams = z.infer<
  typeof technicianParamsSchema
>;