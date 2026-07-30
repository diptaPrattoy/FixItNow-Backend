import {
  AvailabilityStatus,
  Prisma,
  UserStatus,
} from "../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type {
  ServiceQuery,
  TechnicianQuery,
} from "./public.schema.js";

const getPagination = (
  page: number,
  limit: number,
  total: number,
) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});

export const getCategories = async () => {
  return prisma.category.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      createdAt: true,
      _count: {
        select: {
          services: true,
        },
      },
    },
  });
};

const getServiceOrder = (
  sortBy: ServiceQuery["sortBy"],
): Prisma.ServiceOrderByWithRelationInput => {
  if (sortBy === "price_asc") {
    return { price: "asc" };
  }

  if (sortBy === "price_desc") {
    return { price: "desc" };
  }

  if (sortBy === "rating_desc") {
    return {
      technician: {
        averageRating: "desc",
      },
    };
  }

  return { createdAt: "desc" };
};

export const getServices = async (query: ServiceQuery) => {
  const where: Prisma.ServiceWhereInput = {
    isActive: true,
    category: {
      isActive: true,
      ...(query.category && {
        slug: query.category.toLowerCase(),
      }),
    },
    technician: {
      user: {
        status: UserStatus.ACTIVE,
      },
      ...(query.location && {
        location: {
          contains: query.location,
          mode: "insensitive",
        },
      }),
      ...(query.minRating !== undefined && {
        averageRating: {
          gte: query.minRating,
        },
      }),
    },
    ...((query.minPrice !== undefined ||
      query.maxPrice !== undefined) && {
      price: {
        ...(query.minPrice !== undefined && {
          gte: query.minPrice,
        }),
        ...(query.maxPrice !== undefined && {
          lte: query.maxPrice,
        }),
      },
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
        description: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        category: {
          name: {
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
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [services, total] = await prisma.$transaction([
    prisma.service.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: getServiceOrder(query.sortBy),
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        durationMinutes: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        technician: {
          select: {
            id: true,
            location: true,
            averageRating: true,
            reviewCount: true,
            isVerified: true,
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    }),
    prisma.service.count({ where }),
  ]);

  return {
    services,
    pagination: getPagination(
      query.page,
      query.limit,
      total,
    ),
  };
};

const getTechnicianOrder = (
  sortBy: TechnicianQuery["sortBy"],
): Prisma.TechnicianProfileOrderByWithRelationInput => {
  if (sortBy === "experience_desc") {
    return { experienceYears: "desc" };
  }

  if (sortBy === "newest") {
    return { createdAt: "desc" };
  }

  return { averageRating: "desc" };
};

export const getTechnicians = async (
  query: TechnicianQuery,
) => {
  const serviceFilter: Prisma.ServiceWhereInput = {
    isActive: true,
    category: {
      isActive: true,
      ...(query.category && {
        slug: query.category.toLowerCase(),
      }),
    },
    ...((query.minPrice !== undefined ||
      query.maxPrice !== undefined) && {
      price: {
        ...(query.minPrice !== undefined && {
          gte: query.minPrice,
        }),
        ...(query.maxPrice !== undefined && {
          lte: query.maxPrice,
        }),
      },
    }),
  };

  const shouldFilterServices =
    query.category !== undefined ||
    query.minPrice !== undefined ||
    query.maxPrice !== undefined;

  const where: Prisma.TechnicianProfileWhereInput = {
    user: {
      status: UserStatus.ACTIVE,
    },
    ...(query.location && {
      location: {
        contains: query.location,
        mode: "insensitive",
      },
    }),
    ...(query.minRating !== undefined && {
      averageRating: {
        gte: query.minRating,
      },
    }),
    ...(shouldFilterServices && {
      services: {
        some: serviceFilter,
      },
    }),
  };

  if (query.search) {
    where.OR = [
      {
        user: {
          name: {
            contains: query.search,
            mode: "insensitive",
          },
        },
      },
      {
        bio: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        location: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        services: {
          some: {
            isActive: true,
            OR: [
              {
                name: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
              {
                category: {
                  name: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          },
        },
      },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [technicians, total] = await prisma.$transaction([
    prisma.technicianProfile.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: getTechnicianOrder(query.sortBy),
      select: {
        id: true,
        bio: true,
        experienceYears: true,
        location: true,
        averageRating: true,
        reviewCount: true,
        isVerified: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        services: {
          where: {
            isActive: true,
            category: {
              isActive: true,
            },
          },
          orderBy: {
            price: "asc",
          },
          take: 3,
          select: {
            id: true,
            name: true,
            price: true,
            durationMinutes: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    }),
    prisma.technicianProfile.count({ where }),
  ]);

  return {
    technicians,
    pagination: getPagination(
      query.page,
      query.limit,
      total,
    ),
  };
};

export const getTechnicianDetails = async (
  technicianId: string,
) => {
  const technician =
    await prisma.technicianProfile.findFirst({
      where: {
        OR: [
          { id: technicianId },
          { userId: technicianId },
        ],
        user: {
          status: UserStatus.ACTIVE,
        },
      },
      select: {
        id: true,
        bio: true,
        experienceYears: true,
        location: true,
        averageRating: true,
        reviewCount: true,
        isVerified: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        services: {
          where: {
            isActive: true,
            category: {
              isActive: true,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            durationMinutes: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        availabilitySlots: {
          where: {
            status: AvailabilityStatus.AVAILABLE,
            startTime: {
              gt: new Date(),
            },
          },
          orderBy: {
            startTime: "asc",
          },
          take: 20,
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
        reviews: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            customer: {
              select: {
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

  if (!technician) {
    throw new AppError(404, "Technician was not found", {
      code: "TECHNICIAN_NOT_FOUND",
    });
  }

  return technician;
};