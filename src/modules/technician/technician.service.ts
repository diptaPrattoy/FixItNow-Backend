import {
  AvailabilityStatus,
  Prisma,
} from "../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type {
  AvailabilityQuery,
  CreateAvailabilityInput,
  CreateServiceInput,
  UpdateAvailabilityInput,
  UpdateProfileInput,
  UpdateServiceInput,
} from "./technician.schema.js";

const technicianProfileSelect = {
  id: true,
  bio: true,
  experienceYears: true,
  location: true,
  averageRating: true,
  reviewCount: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      status: true,
    },
  },
  _count: {
    select: {
      services: true,
      availabilitySlots: true,
      bookings: true,
      reviews: true,
    },
  },
} as const;

const serviceSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  durationMinutes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
    },
  },
  _count: {
    select: {
      bookings: true,
    },
  },
} as const;

const availabilitySelect = {
  id: true,
  startTime: true,
  endTime: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      bookings: true,
    },
  },
} as const;

const getTechnician = async (userId: string) => {
  const technician = await prisma.technicianProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!technician) {
    throw new AppError(404, "Technician profile was not found", {
      code: "TECHNICIAN_PROFILE_NOT_FOUND",
    });
  }

  return technician;
};

const ensureActiveCategory = async (categoryId: string) => {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!category) {
    throw new AppError(404, "Active category was not found", {
      code: "CATEGORY_NOT_FOUND",
    });
  }
};

const getOwnedService = async (
  technicianId: string,
  serviceId: string,
) => {
  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      technicianId,
    },
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  });

  if (!service) {
    throw new AppError(404, "Service was not found", {
      code: "SERVICE_NOT_FOUND",
    });
  }

  return service;
};

const getOwnedAvailability = async (
  technicianId: string,
  availabilityId: string,
) => {
  const availability = await prisma.availabilitySlot.findFirst({
    where: {
      id: availabilityId,
      technicianId,
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  });

  if (!availability) {
    throw new AppError(404, "Availability slot was not found", {
      code: "AVAILABILITY_NOT_FOUND",
    });
  }

  return availability;
};

const ensureNoAvailabilityOverlap = async (
  technicianId: string,
  startTime: Date,
  endTime: Date,
  ignoredId?: string,
) => {
  const overlappingSlot =
    await prisma.availabilitySlot.findFirst({
      where: {
        technicianId,
        ...(ignoredId && {
          id: {
            not: ignoredId,
          },
        }),
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
      },
      select: {
        id: true,
      },
    });

  if (overlappingSlot) {
    throw new AppError(
      409,
      "This availability overlaps another time slot",
      {
        code: "AVAILABILITY_OVERLAP",
        conflictingSlotId: overlappingSlot.id,
      },
    );
  }
};

const validateFutureAvailability = (
  startTime: Date,
  endTime: Date,
) => {
  if (startTime <= new Date()) {
    throw new AppError(400, "Start time must be in the future", {
      code: "START_TIME_IN_PAST",
    });
  }

  if (endTime <= startTime) {
    throw new AppError(400, "End time must be after start time", {
      code: "INVALID_TIME_RANGE",
    });
  }
};

export const getOwnProfile = async (userId: string) => {
  const profile = await prisma.technicianProfile.findUnique({
    where: {
      userId,
    },
    select: technicianProfileSelect,
  });

  if (!profile) {
    throw new AppError(404, "Technician profile was not found", {
      code: "TECHNICIAN_PROFILE_NOT_FOUND",
    });
  }

  return profile;
};

export const updateOwnProfile = async (
  userId: string,
  input: UpdateProfileInput,
) => {
  const technician = await getTechnician(userId);

  const userData: Prisma.UserUpdateInput = {};
  const profileData: Prisma.TechnicianProfileUpdateInput = {};

  if (input.name !== undefined) {
    userData.name = input.name;
  }

  if (input.phone !== undefined) {
    userData.phone = input.phone;
  }

  if (input.avatarUrl !== undefined) {
    userData.avatarUrl = input.avatarUrl;
  }

  if (input.bio !== undefined) {
    profileData.bio = input.bio;
  }

  if (input.experienceYears !== undefined) {
    profileData.experienceYears = input.experienceYears;
  }

  if (input.location !== undefined) {
    profileData.location = input.location;
  }

  return prisma.$transaction(async (transaction) => {
    if (Object.keys(userData).length > 0) {
      await transaction.user.update({
        where: {
          id: userId,
        },
        data: userData,
      });
    }

    if (Object.keys(profileData).length > 0) {
      await transaction.technicianProfile.update({
        where: {
          id: technician.id,
        },
        data: profileData,
      });
    }

    return transaction.technicianProfile.findUniqueOrThrow({
      where: {
        id: technician.id,
      },
      select: technicianProfileSelect,
    });
  });
};

export const createTechnicianService = async (
  userId: string,
  input: CreateServiceInput,
) => {
  const technician = await getTechnician(userId);

  await ensureActiveCategory(input.categoryId);

  const duplicateService = await prisma.service.findFirst({
    where: {
      technicianId: technician.id,
      name: {
        equals: input.name,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicateService) {
    throw new AppError(
      409,
      "You already have a service with this name",
      {
        code: "SERVICE_NAME_ALREADY_EXISTS",
      },
    );
  }

  return prisma.service.create({
    data: {
      technicianId: technician.id,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      durationMinutes: input.durationMinutes,
    },
    select: serviceSelect,
  });
};

export const getOwnServices = async (userId: string) => {
  const technician = await getTechnician(userId);

  return prisma.service.findMany({
    where: {
      technicianId: technician.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: serviceSelect,
  });
};

export const updateTechnicianService = async (
  userId: string,
  serviceId: string,
  input: UpdateServiceInput,
) => {
  const technician = await getTechnician(userId);

  await getOwnedService(technician.id, serviceId);

  if (input.categoryId !== undefined) {
    await ensureActiveCategory(input.categoryId);
  }

  if (input.name !== undefined) {
    const duplicateService = await prisma.service.findFirst({
      where: {
        technicianId: technician.id,
        id: {
          not: serviceId,
        },
        name: {
          equals: input.name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateService) {
      throw new AppError(
        409,
        "You already have a service with this name",
        {
          code: "SERVICE_NAME_ALREADY_EXISTS",
        },
      );
    }
  }

  return prisma.service.update({
    where: {
      id: serviceId,
    },
    data: {
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      price: input.price,
      durationMinutes: input.durationMinutes,
      isActive: input.isActive,
    },
    select: serviceSelect,
  });
};

export const deactivateTechnicianService = async (
  userId: string,
  serviceId: string,
) => {
  const technician = await getTechnician(userId);

  await getOwnedService(technician.id, serviceId);

  return prisma.service.update({
    where: {
      id: serviceId,
    },
    data: {
      isActive: false,
    },
    select: serviceSelect,
  });
};

export const createTechnicianAvailability = async (
  userId: string,
  input: CreateAvailabilityInput,
) => {
  const technician = await getTechnician(userId);

  validateFutureAvailability(input.startTime, input.endTime);

  await ensureNoAvailabilityOverlap(
    technician.id,
    input.startTime,
    input.endTime,
  );

  return prisma.availabilitySlot.create({
    data: {
      technicianId: technician.id,
      startTime: input.startTime,
      endTime: input.endTime,
      status: input.status,
    },
    select: availabilitySelect,
  });
};

export const getOwnAvailability = async (
  userId: string,
  query: AvailabilityQuery,
) => {
  const technician = await getTechnician(userId);
  const skip = (query.page - 1) * query.limit;

  const where: Prisma.AvailabilitySlotWhereInput = {
    technicianId: technician.id,
    ...(query.status && {
      status: query.status,
    }),
    ...((query.from || query.to) && {
      startTime: {
        ...(query.from && {
          gte: query.from,
        }),
        ...(query.to && {
          lte: query.to,
        }),
      },
    }),
  };

  const [availability, total] = await prisma.$transaction([
    prisma.availabilitySlot.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        startTime: "asc",
      },
      select: availabilitySelect,
    }),
    prisma.availabilitySlot.count({
      where,
    }),
  ]);

  return {
    availability,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
      hasNextPage: query.page * query.limit < total,
      hasPreviousPage: query.page > 1,
    },
  };
};

export const updateTechnicianAvailability = async (
  userId: string,
  availabilityId: string,
  input: UpdateAvailabilityInput,
) => {
  const technician = await getTechnician(userId);

  const availability = await getOwnedAvailability(
    technician.id,
    availabilityId,
  );

  if (availability.status === AvailabilityStatus.BOOKED) {
    throw new AppError(409, "A booked slot cannot be modified", {
      code: "BOOKED_SLOT_CANNOT_BE_CHANGED",
    });
  }

  const startTime = input.startTime ?? availability.startTime;
  const endTime = input.endTime ?? availability.endTime;

  validateFutureAvailability(startTime, endTime);

  await ensureNoAvailabilityOverlap(
    technician.id,
    startTime,
    endTime,
    availabilityId,
  );

  return prisma.availabilitySlot.update({
    where: {
      id: availabilityId,
    },
    data: {
      startTime: input.startTime,
      endTime: input.endTime,
      status: input.status,
    },
    select: availabilitySelect,
  });
};

export const deleteTechnicianAvailability = async (
  userId: string,
  availabilityId: string,
) => {
  const technician = await getTechnician(userId);

  const availability = await getOwnedAvailability(
    technician.id,
    availabilityId,
  );

  if (
    availability.status === AvailabilityStatus.BOOKED ||
    availability._count.bookings > 0
  ) {
    throw new AppError(
      409,
      "Availability with booking history cannot be deleted",
      {
        code: "AVAILABILITY_HAS_BOOKINGS",
      },
    );
  }

  return prisma.availabilitySlot.delete({
    where: {
      id: availabilityId,
    },
    select: availabilitySelect,
  });
};