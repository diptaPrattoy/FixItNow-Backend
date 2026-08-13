import { Prisma, UserRole, UserStatus } from "../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import type {
  AdminBookingListQuery,
  AdminListQuery,
  AdminUserListQuery,
  CreateCategoryInput,
  CreateAdminInput,
  UpdateCategoryInput,
  UpdateUserStatusInput,
} from "./admin.schema.js";

const getPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});

const createSlug = (name: string) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  technicianProfile: {
    select: {
      id: true,
      location: true,
      experienceYears: true,
      averageRating: true,
      reviewCount: true,
      isVerified: true,
    },
  },
  _count: {
    select: {
      customerBookings: true,
      payments: true,
      reviews: true,
    },
  },
} satisfies Prisma.UserSelect;

const adminBookingSelect = {
  id: true,
  address: true,
  notes: true,
  amount: true,
  status: true,
  declineReason: true,
  cancellationReason: true,
  acceptedAt: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
  technician: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  },
  service: {
    select: {
      id: true,
      name: true,
      price: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
  availabilitySlot: {
    select: {
      id: true,
      startTime: true,
      endTime: true,
    },
  },
  payments: {
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      transactionId: true,
      amount: true,
      status: true,
      provider: true,
      paidAt: true,
    },
  },
  review: {
    select: {
      id: true,
      rating: true,
      comment: true,
    },
  },
} satisfies Prisma.BookingSelect;

export const getAdminUsers = async (query: AdminUserListQuery) => {
  const where: Prisma.UserWhereInput = {
    ...(query.role && {
      role: query.role,
    }),
    ...(query.status && {
      status: query.status,
    }),
  };

  if (query.search) {
    where.OR = [
      {
        name: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        phone: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        technicianProfile: {
          location: {
            contains: query.search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        createdAt: "desc",
      },
      select: adminUserSelect,
    }),

    prisma.user.count({
      where,
    }),
  ]);

  return {
    users,
    pagination: getPagination(query.page, query.limit, total),
  };
};

export const updateAdminUserStatus = async (
  adminId: string,
  userId: string,
  input: UpdateUserStatusInput,
) => {
  if (adminId === userId) {
    throw new AppError(
      409,
      "You cannot change the status of your own account",
      {
        code: "ADMIN_SELF_STATUS_CHANGE_BLOCKED",
      },
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User was not found", {
      code: "USER_NOT_FOUND",
    });
  }

  if (user.role === UserRole.ADMIN) {
    throw new AppError(403, "Another administrator account cannot be banned", {
      code: "ADMIN_STATUS_CHANGE_FORBIDDEN",
    });
  }

  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      status: input.status as UserStatus,
    },
    select: adminUserSelect,
  });
};

export const getAdminBookings = async (query: AdminBookingListQuery) => {
  const where: Prisma.BookingWhereInput = {
    ...(query.status && {
      status: query.status,
    }),
  };

  if (query.search) {
    where.OR = [
      {
        customer: {
          name: {
            contains: query.search,
            mode: "insensitive",
          },
        },
      },
      {
        customer: {
          email: {
            contains: query.search,
            mode: "insensitive",
          },
        },
      },
      {
        technician: {
          user: {
            name: {
              contains: query.search,
              mode: "insensitive",
            },
          },
        },
      },
      {
        service: {
          name: {
            contains: query.search,
            mode: "insensitive",
          },
        },
      },
      {
        address: {
          contains: query.search,
          mode: "insensitive",
        },
      },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [bookings, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        createdAt: "desc",
      },
      select: adminBookingSelect,
    }),

    prisma.booking.count({
      where,
    }),
  ]);

  return {
    bookings,
    pagination: getPagination(query.page, query.limit, total),
  };
};

export const getAdminCategories = async () => {
  return prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          services: true,
        },
      },
    },
  });
};

export const createAdminCategory = async (input: CreateCategoryInput) => {
  const slug = createSlug(input.name);

  if (!slug) {
    throw new AppError(400, "Category name is invalid", {
      code: "INVALID_CATEGORY_NAME",
    });
  }

  const existingCategory = await prisma.category.findFirst({
    where: {
      OR: [
        {
          slug,
        },
        {
          name: {
            equals: input.name,
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (existingCategory) {
    throw new AppError(409, "Category already exists", {
      code: "CATEGORY_ALREADY_EXISTS",
    });
  }

  return prisma.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description ?? null,
    },
  });
};

export const updateAdminCategory = async (
  categoryId: string,
  input: UpdateCategoryInput,
) => {
  const category = await prisma.category.findUnique({
    where: {
      id: categoryId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!category) {
    throw new AppError(404, "Category was not found", {
      code: "CATEGORY_NOT_FOUND",
    });
  }

  let slug: string | undefined;

  if (input.name !== undefined) {
    slug = createSlug(input.name);

    if (!slug) {
      throw new AppError(400, "Category name is invalid", {
        code: "INVALID_CATEGORY_NAME",
      });
    }

    const duplicate = await prisma.category.findFirst({
      where: {
        id: {
          not: categoryId,
        },
        OR: [
          {
            slug,
          },
          {
            name: {
              equals: input.name,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      throw new AppError(409, "Category already exists", {
        code: "CATEGORY_ALREADY_EXISTS",
      });
    }
  }

  return prisma.category.update({
    where: {
      id: categoryId,
    },
    data: {
      name: input.name,
      slug,
      description: input.description,
      isActive: input.isActive,
    },
  });
};

export const getAdminContactMessages = async () => {
  return prisma.contactMessage.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const markContactMessageAsRead = async (messageId: string) => {
  const message = await prisma.contactMessage.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw new AppError(404, "Contact message was not found", {
      code: "CONTACT_MESSAGE_NOT_FOUND",
    });
  }

  return prisma.contactMessage.update({
    where: {
      id: messageId,
    },
    data: {
      status: "READ",
    },
  });
};

// export const createAdminUser = async (input: CreateAdminInput) => {
//   const existingUser = await prisma.user.findUnique({
//     where: {
//       email: input.email,
//     },
//     select: {
//       id: true,
//     },
//   });

//   if (existingUser) {
//     throw new AppError(409, "An account with this email already exists", {
//       code: "EMAIL_ALREADY_EXISTS",
//       field: "email",
//     });
//   }

//   const passwordHash = await bcrypt.hash(input.password, 12);

//   const admin = await prisma.user.create({
//     data: {
//       name: input.name,
//       email: input.email,
//       phone: input.phone ?? null,
//       passwordHash,
//       role: UserRole.ADMIN,
//       status: UserStatus.ACTIVE,
//     },
//     select: {
//       id: true,
//       name: true,
//       email: true,
//       phone: true,
//       avatarUrl: true,
//       role: true,
//       status: true,
//       createdAt: true,
//       updatedAt: true,
//     },
//   });

//   return admin;
// };

export const createAdminAccount = async (input: CreateAdminInput) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new AppError(409, "An account with this email already exists", {
      code: "EMAIL_ALREADY_EXISTS",
      field: "email",
    });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const admin = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return admin;
};

export const getAdminAccounts = async (query: AdminListQuery) => {
  const where: Prisma.UserWhereInput = {
    role: UserRole.ADMIN,

    ...(query.status && {
      status: query.status,
    }),
  };

  if (query.search) {
    where.OR = [
      {
        name: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        phone: {
          contains: query.search,
          mode: "insensitive",
        },
      },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [admins, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

    prisma.user.count({
      where,
    }),
  ]);

  return {
    admins,
    pagination: getPagination(query.page, query.limit, total),
  };
};
