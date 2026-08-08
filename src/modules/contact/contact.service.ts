import { prisma } from "../../lib/prisma.js";
import type { CreateContactInput } from "./contact.schema.js";

export const createContactMessage = async (
  input: CreateContactInput,
) => {
  return prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      subject: input.subject,
      message: input.message,
    },
    select: {
      id: true,
      name: true,
      email: true,
      subject: true,
      status: true,
      createdAt: true,
    },
  });
};