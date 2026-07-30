import {
  BookingStatus,
  Prisma,
} from "../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type { CreateReviewInput } from "./review.schema.js";

const reviewSelect = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  booking: {
    select: {
      id: true,
      status: true,
      service: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  },
  technician: {
    select: {
      id: true,
      averageRating: true,
      reviewCount: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.ReviewSelect;

export const createCustomerReview = async (
  customerId: string,
  input: CreateReviewInput,
) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: input.bookingId,
      customerId,
    },
    select: {
      id: true,
      status: true,
      technicianId: true,
      review: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!booking) {
    throw new AppError(404, "Booking was not found", {
      code: "BOOKING_NOT_FOUND",
    });
  }

  if (booking.status !== BookingStatus.COMPLETED) {
    throw new AppError(
      409,
      "A review can only be submitted after job completion",
      {
        code: "BOOKING_NOT_COMPLETED",
        currentStatus: booking.status,
      },
    );
  }

  if (booking.review) {
    throw new AppError(
      409,
      "A review has already been submitted for this booking",
      {
        code: "REVIEW_ALREADY_EXISTS",
      },
    );
  }

  return prisma.$transaction(async (transaction) => {
    const review = await transaction.review.create({
      data: {
        bookingId: booking.id,
        customerId,
        technicianId: booking.technicianId,
        rating: input.rating,
        comment: input.comment ?? null,
      },
      select: reviewSelect,
    });

    const summary = await transaction.review.aggregate({
      where: {
        technicianId: booking.technicianId,
      },
      _avg: {
        rating: true,
      },
      _count: {
        _all: true,
      },
    });

    await transaction.technicianProfile.update({
      where: {
        id: booking.technicianId,
      },
      data: {
        averageRating: summary._avg.rating ?? 0,
        reviewCount: summary._count._all,
      },
    });

    return review;
  });
};