import {
  AvailabilityStatus,
  BookingStatus,
  PaymentStatus,
  Prisma,
  UserStatus,
} from "../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type {
  BookingListQuery,
  CancelBookingInput,
  CreateBookingInput,
  TechnicianBookingUpdateInput,
} from "./booking.schema.js";

const bookingDetailsSelect = {
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
      avatarUrl: true,
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
          email: true,
          phone: true,
          avatarUrl: true,
        },
      },
    },
  },

  service: {
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

  availabilitySlot: {
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
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
      currency: true,
      provider: true,
      method: true,
      status: true,
      paidAt: true,
      createdAt: true,
    },
  },

  review: {
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
    },
  },
} satisfies Prisma.BookingSelect;

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

export const createCustomerBooking = async (
  customerId: string,
  input: CreateBookingInput,
) => {
  const service = await prisma.service.findFirst({
    where: {
      id: input.serviceId,
      isActive: true,
      category: {
        isActive: true,
      },
      technician: {
        user: {
          status: UserStatus.ACTIVE,
        },
      },
    },
    select: {
      id: true,
      price: true,
      durationMinutes: true,
      technicianId: true,
    },
  });

  if (!service) {
    throw new AppError(404, "Active service was not found", {
      code: "SERVICE_NOT_FOUND",
    });
  }

  const slot = await prisma.availabilitySlot.findFirst({
    where: {
      id: input.availabilitySlotId,
      technicianId: service.technicianId,
      status: AvailabilityStatus.AVAILABLE,
      startTime: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
    },
  });

  if (!slot) {
    throw new AppError(
      409,
      "The selected availability slot is no longer available",
      {
        code: "AVAILABILITY_NOT_AVAILABLE",
      },
    );
  }

  const slotDuration =
    slot.endTime.getTime() - slot.startTime.getTime();

  const serviceDuration = service.durationMinutes * 60 * 1000;

  if (slotDuration < serviceDuration) {
    throw new AppError(
      400,
      "The selected slot is shorter than the service duration",
      {
        code: "INSUFFICIENT_SLOT_DURATION",
      },
    );
  }

  return prisma.$transaction(async (transaction) => {
    const reservedSlot =
      await transaction.availabilitySlot.updateMany({
        where: {
          id: slot.id,
          technicianId: service.technicianId,
          status: AvailabilityStatus.AVAILABLE,
          startTime: {
            gt: new Date(),
          },
        },
        data: {
          status: AvailabilityStatus.BOOKED,
        },
      });

    if (reservedSlot.count !== 1) {
      throw new AppError(
        409,
        "The selected availability slot was just booked",
        {
          code: "AVAILABILITY_ALREADY_BOOKED",
        },
      );
    }

    return transaction.booking.create({
      data: {
        customerId,
        technicianId: service.technicianId,
        serviceId: service.id,
        availabilitySlotId: slot.id,
        address: input.address,
        notes: input.notes ?? null,
        amount: service.price,
        status: BookingStatus.REQUESTED,
      },
      select: bookingDetailsSelect,
    });
  });
};

export const getCustomerBookings = async (
  customerId: string,
  query: BookingListQuery,
) => {
  const where: Prisma.BookingWhereInput = {
    customerId,
    ...(query.status && {
      status: query.status,
    }),
  };

  const skip = (query.page - 1) * query.limit;

  const [bookings, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        createdAt: "desc",
      },
      select: bookingDetailsSelect,
    }),

    prisma.booking.count({
      where,
    }),
  ]);

  return {
    bookings,
    pagination: getPagination(
      query.page,
      query.limit,
      total,
    ),
  };
};

export const getCustomerBookingDetails = async (
  customerId: string,
  bookingId: string,
) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      customerId,
    },
    select: bookingDetailsSelect,
  });

  if (!booking) {
    throw new AppError(404, "Booking was not found", {
      code: "BOOKING_NOT_FOUND",
    });
  }

  return booking;
};

export const cancelCustomerBooking = async (
  customerId: string,
  bookingId: string,
  input: CancelBookingInput,
) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      customerId,
    },
    select: {
      id: true,
      status: true,
      availabilitySlotId: true,
    },
  });

  if (!booking) {
    throw new AppError(404, "Booking was not found", {
      code: "BOOKING_NOT_FOUND",
    });
  }

  const cancellableStatuses: BookingStatus[] = [
    BookingStatus.REQUESTED,
    BookingStatus.ACCEPTED,
    BookingStatus.PAID,
  ];

  if (!cancellableStatuses.includes(booking.status)) {
    throw new AppError(
      409,
      `A ${booking.status} booking cannot be cancelled`,
      {
        code: "BOOKING_CANNOT_BE_CANCELLED",
        currentStatus: booking.status,
      },
    );
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.availabilitySlot.update({
      where: {
        id: booking.availabilitySlotId,
      },
      data: {
        status: AvailabilityStatus.AVAILABLE,
      },
    });

    await transaction.payment.updateMany({
      where: {
        bookingId: booking.id,
        status: PaymentStatus.PENDING,
      },
      data: {
        status: PaymentStatus.CANCELLED,
      },
    });

    return transaction.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: input.reason,
        cancelledAt: new Date(),
      },
      select: bookingDetailsSelect,
    });
  });
};

export const getTechnicianBookings = async (
  technicianUserId: string,
  query: BookingListQuery,
) => {
  const where: Prisma.BookingWhereInput = {
    technician: {
      userId: technicianUserId,
    },
    ...(query.status && {
      status: query.status,
    }),
  };

  const skip = (query.page - 1) * query.limit;

  const [bookings, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        createdAt: "desc",
      },
      select: bookingDetailsSelect,
    }),

    prisma.booking.count({
      where,
    }),
  ]);

  return {
    bookings,
    pagination: getPagination(
      query.page,
      query.limit,
      total,
    ),
  };
};

export const getTechnicianBookingDetails = async (
  technicianUserId: string,
  bookingId: string,
) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      technician: {
        userId: technicianUserId,
      },
    },
    select: bookingDetailsSelect,
  });

  if (!booking) {
    throw new AppError(404, "Booking was not found", {
      code: "BOOKING_NOT_FOUND",
    });
  }

  return booking;
};

const validateBookingTransition = (
  currentStatus: BookingStatus,
  nextStatus: BookingStatus,
) => {
  const transitions: Partial<
    Record<BookingStatus, BookingStatus[]>
  > = {
    [BookingStatus.REQUESTED]: [
      BookingStatus.ACCEPTED,
      BookingStatus.DECLINED,
    ],

    [BookingStatus.PAID]: [
      BookingStatus.IN_PROGRESS,
    ],

    [BookingStatus.IN_PROGRESS]: [
      BookingStatus.COMPLETED,
    ],
  };

  if (!transitions[currentStatus]?.includes(nextStatus)) {
    throw new AppError(
      409,
      `Booking cannot move from ${currentStatus} to ${nextStatus}`,
      {
        code: "INVALID_BOOKING_TRANSITION",
        currentStatus,
        requestedStatus: nextStatus,
      },
    );
  }
};

export const updateTechnicianBookingStatus = async (
  technicianUserId: string,
  bookingId: string,
  input: TechnicianBookingUpdateInput,
) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      technician: {
        userId: technicianUserId,
      },
    },
    select: {
      id: true,
      status: true,
      availabilitySlotId: true,
    },
  });

  if (!booking) {
    throw new AppError(404, "Booking was not found", {
      code: "BOOKING_NOT_FOUND",
    });
  }

  const nextStatus = input.status as BookingStatus;

  validateBookingTransition(booking.status, nextStatus);

  return prisma.$transaction(async (transaction) => {
    if (nextStatus === BookingStatus.DECLINED) {
      await transaction.availabilitySlot.update({
        where: {
          id: booking.availabilitySlotId,
        },
        data: {
          status: AvailabilityStatus.AVAILABLE,
        },
      });
    }

    const updateData: Prisma.BookingUpdateInput = {
      status: nextStatus,
    };

    if (nextStatus === BookingStatus.ACCEPTED) {
      updateData.acceptedAt = new Date();
    }

    if (nextStatus === BookingStatus.DECLINED) {
      updateData.declineReason = input.declineReason;
    }

    if (nextStatus === BookingStatus.IN_PROGRESS) {
      updateData.startedAt = new Date();
    }

    if (nextStatus === BookingStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    return transaction.booking.update({
      where: {
        id: booking.id,
      },
      data: updateData,
      select: bookingDetailsSelect,
    });
  });
};