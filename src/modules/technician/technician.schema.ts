import { z } from "zod";

const uuidParams = z.object({
  id: z.string().uuid("ID must be a valid UUID"),
});

const optionalPhone = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, "Phone number must contain 7 to 15 digits")
  .nullable()
  .optional();

const updateProfileBody = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters")
      .max(100, "Name must not exceed 100 characters")
      .optional(),

    phone: optionalPhone,

    avatarUrl: z
      .string()
      .trim()
      .url("Avatar URL must be valid")
      .nullable()
      .optional(),

    bio: z
      .string()
      .trim()
      .max(1000, "Bio must not exceed 1000 characters")
      .nullable()
      .optional(),

    experienceYears: z.coerce
      .number()
      .int("Experience must be an integer")
      .min(0, "Experience cannot be negative")
      .max(60, "Experience cannot exceed 60 years")
      .optional(),

    location: z
      .string()
      .trim()
      .min(2, "Location must contain at least 2 characters")
      .max(150, "Location must not exceed 150 characters")
      .optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update",
  });

const serviceBody = z.object({
  categoryId: z.string().uuid("Category ID must be a valid UUID"),

  name: z
    .string()
    .trim()
    .min(3, "Service name must contain at least 3 characters")
    .max(150, "Service name must not exceed 150 characters"),

  description: z
    .string()
    .trim()
    .max(2000, "Description must not exceed 2000 characters")
    .nullable()
    .optional(),

  price: z.coerce
    .number()
    .positive("Price must be greater than zero")
    .max(1000000, "Price is too large"),

  durationMinutes: z.coerce
    .number()
    .int("Duration must be an integer")
    .min(15, "Duration must be at least 15 minutes")
    .max(1440, "Duration must not exceed 1440 minutes"),
});

const updateServiceBody = serviceBody
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update",
  });

const availabilityBody = z
  .object({
    startTime: z.coerce.date({
      error: "Start time must be a valid date",
    }),

    endTime: z.coerce.date({
      error: "End time must be a valid date",
    }),

    status: z.enum(["AVAILABLE", "BLOCKED"]).default("AVAILABLE"),
  })
  .refine((data) => data.endTime > data.startTime, {
    path: ["endTime"],
    message: "End time must be after start time",
  });

const updateAvailabilityBody = z
  .object({
    startTime: z.coerce
      .date({
        error: "Start time must be a valid date",
      })
      .optional(),

    endTime: z.coerce
      .date({
        error: "End time must be a valid date",
      })
      .optional(),

    status: z.enum(["AVAILABLE", "BLOCKED"]).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update",
  })
  .refine(
    (data) => !data.startTime || !data.endTime || data.endTime > data.startTime,
    {
      path: ["endTime"],
      message: "End time must be after start time",
    },
  );

const availabilityQuery = z
  .object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(50).default(20),

    status: z.enum(["AVAILABLE", "BOOKED", "BLOCKED"]).optional(),

    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((query) => !query.from || !query.to || query.to > query.from, {
    path: ["to"],
    message: "To date must be after from date",
  });

export const updateTechnicianProfileSchema = z.object({
  body: updateProfileBody,
});

export const createServiceSchema = z.object({
  body: serviceBody,
});

export const updateServiceSchema = z.object({
  params: uuidParams,
  body: updateServiceBody,
});

export const serviceParamsSchema = z.object({
  params: uuidParams,
});

export const createAvailabilitySchema = z.object({
  body: availabilityBody,
});

export const updateAvailabilitySchema = z.object({
  params: uuidParams,
  body: updateAvailabilityBody,
});

export const availabilityParamsSchema = z.object({
  params: uuidParams,
});

export const availabilityListSchema = z.object({
  query: availabilityQuery,
});

export type UpdateProfileInput = z.infer<typeof updateProfileBody>;

export type CreateServiceInput = z.infer<typeof serviceBody>;

export type UpdateServiceInput = z.infer<typeof updateServiceBody>;

export type CreateAvailabilityInput = z.infer<typeof availabilityBody>;

export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilityBody>;

export type AvailabilityQuery = z.infer<typeof availabilityQuery>;

export type IdParams = z.infer<typeof uuidParams>;
