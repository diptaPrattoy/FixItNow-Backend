import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { z } from "zod";

import {
  PrismaClient,
  UserRole,
  UserStatus,
} from "../src/generated/prisma/client.js";

const seedEnvSchema = z.object({
  DIRECT_URL: z.string().min(1),
  ADMIN_NAME: z.string().min(2),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
});

const env = seedEnvSchema.parse(process.env);

const adapter = new PrismaPg({
  connectionString: env.DIRECT_URL,
});

const prisma = new PrismaClient({ adapter });

const categories = [
  {
    name: "Plumbing",
    slug: "plumbing",
    description: "Pipe repair, leakage fixing and plumbing installation",
  },
  {
    name: "Electrical",
    slug: "electrical",
    description: "Electrical repair, wiring and installation services",
  },
  {
    name: "Cleaning",
    slug: "cleaning",
    description: "Residential and commercial cleaning services",
  },
  {
    name: "Painting",
    slug: "painting",
    description: "Interior and exterior painting services",
  },
  {
    name: "Appliance Repair",
    slug: "appliance-repair",
    description: "Repair and maintenance of household appliances",
  },
  {
    name: "AC Servicing",
    slug: "ac-servicing",
    description: "Air conditioner installation, repair and maintenance",
  },
];

async function seedAdmin() {
  const email = env.ADMIN_EMAIL.toLowerCase();
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

  return prisma.user.upsert({
    where: { email },
    update: {
      name: env.ADMIN_NAME,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: env.ADMIN_NAME,
      email,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
}

async function seedCategories() {
  return Promise.all(
    categories.map((category) =>
      prisma.category.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          description: category.description,
          isActive: true,
        },
        create: category,
      }),
    ),
  );
}

async function main() {
  const admin = await seedAdmin();
  const seededCategories = await seedCategories();

  console.log(`Admin created: ${admin.email}`);
  console.log(`${seededCategories.length} categories created`);
}

main()
  .catch((error: unknown) => {
    console.error("Database seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
