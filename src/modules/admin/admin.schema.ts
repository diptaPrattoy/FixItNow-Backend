import { z } from "zod";

const idParamsSchema = z.object({
  id: z.string().uuid("ID must be a valid UUID"),
});

const pagination = {
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
};

const userListQuerySchema = z.object({
  ...pagination,

  search: z
    .string()
    .trim()
    .max(150)
    .optional(),

  role: z
    .enum(["CUSTOMER", "TECHNICIAN", "ADMIN"])
    .optional(),

  status: z.enum(["ACTIVE", "BANNED"]).optional(),
});

const updateUserStatusBodySchema = z.object({
  status: z.enum(["ACTIVE", "BANNED"]),
});

const bookingListQuerySchema = z.object({
  ...pagination,

  search: z
    .string()
    .trim()
    .max(150)
    .optional(),

  status: z
    .enum([
      "REQUESTED",
      "ACCEPTED",
      "DECLINED",
      "CANCELLED",
      "PAID",
      "IN_PROGRESS",
      "COMPLETED",
    ])
    .optional(),
});

const createCategoryBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name must contain at least 2 characters")
    .max(100, "Category name must not exceed 100 characters"),

  description: z
    .string()
    .trim()
    .max(1000, "Description must not exceed 1000 characters")
    .nullable()
    .optional(),
});

const updateCategoryBodySchema = createCategoryBodySchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    {
      message: "Provide at least one field to update",
    },
  );

export const listAdminUsersSchema = z.object({
  query: userListQuerySchema,
});

export const updateUserStatusSchema = z.object({
  params: idParamsSchema,
  body: updateUserStatusBodySchema,
});

export const listAdminBookingsSchema = z.object({
  query: bookingListQuerySchema,
});

export const createCategorySchema = z.object({
  body: createCategoryBodySchema,
});

export const updateCategorySchema = z.object({
  params: idParamsSchema,
  body: updateCategoryBodySchema,
});

export type AdminUserListQuery = z.infer<
  typeof userListQuerySchema
>;

export type UpdateUserStatusInput = z.infer<
  typeof updateUserStatusBodySchema
>;

export type AdminBookingListQuery = z.infer<
  typeof bookingListQuerySchema
>;

export type CreateCategoryInput = z.infer<
  typeof createCategoryBodySchema
>;

export type UpdateCategoryInput = z.infer<
  typeof updateCategoryBodySchema
>;

export type AdminIdParams = z.infer<typeof idParamsSchema>;