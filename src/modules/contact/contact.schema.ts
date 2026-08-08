import { z } from "zod";

const createContactBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),

  email: z.string().trim().email("Enter a valid email address").max(150),

  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long")
    .optional()
    .or(z.literal("")),

  subject: z
    .string()
    .trim()
    .min(3, "Subject must contain at least 3 characters")
    .max(150, "Subject must not exceed 150 characters"),

  message: z
    .string()
    .trim()
    .min(10, "Message must contain at least 10 characters")
    .max(2000, "Message must not exceed 2000 characters"),
});

export const createContactSchema = z.object({
  body: createContactBodySchema,
});

export type CreateContactInput = z.infer<typeof createContactBodySchema>;
