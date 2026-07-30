import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters")
  .max(72, "Password must not exceed 72 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

const registerBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters")
      .max(100, "Name must not exceed 100 characters"),

    email: z.string().trim().toLowerCase().email("Enter a valid email address"),

    password: passwordSchema,

    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{7,15}$/, "Phone number must contain 7 to 15 digits")
      .optional(),

    role: z.enum(["CUSTOMER", "TECHNICIAN"], {
      message: "Role must be CUSTOMER or TECHNICIAN",
    }),

    location: z
      .string()
      .trim()
      .min(2, "Location must contain at least 2 characters")
      .max(150, "Location must not exceed 150 characters")
      .optional(),
  })
  .superRefine((data, context) => {
    if (data.role === "TECHNICIAN" && !data.location) {
      context.addIssue({
        code: "custom",
        path: ["location"],
        message: "Location is required for technicians",
      });
    }
  });

const loginBodySchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),

  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  body: registerBodySchema,
});

export const loginSchema = z.object({
  body: loginBodySchema,
});

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;
