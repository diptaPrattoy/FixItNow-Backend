import { randomBytes } from "node:crypto";

import {
  BookingStatus,
  PaymentStatus,
  Prisma,
  UserStatus,
} from "../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import type { CreatePaymentInput, PaymentListQuery } from "./payment.schema.js";
import {
  initiateSslCommerzPayment,
  validateSslCommerzPayment,
  type SslCommerzResponse,
} from "./sslcommerz.client.js";
const paymentSelect = {
  id: true,
  transactionId: true,
  sessionKey: true,
  bankTransactionId: true,
  validationId: true,
  amount: true,
  currency: true,
  provider: true,
  method: true,
  status: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  booking: {
    select: {
      id: true,
      status: true,
      address: true,
      service: {
        select: {
          id: true,
          name: true,
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
      technician: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.PaymentSelect;

const createTransactionId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(5).toString("hex").toUpperCase();

  return `FIX${timestamp}${random}`;
};

const toJson = (value: SslCommerzResponse): Prisma.InputJsonValue => {
  return value as Prisma.InputJsonValue;
};

const getText = (
  body: Record<string, unknown> | undefined,
  key: string,
): string | undefined => {
  if (!body) {
    return undefined;
  }

  const value = body[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed || undefined;
};

export const createPaymentSession = async (
  customerId: string,
  input: CreatePaymentInput,
) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: input.bookingId,
      customerId,
    },
    select: {
      id: true,
      status: true,
      amount: true,
      address: true,
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
        },
      },
      service: {
        select: {
          name: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    throw new AppError(404, "Booking was not found", {
      code: "BOOKING_NOT_FOUND",
    });
  }

  if (booking.customer.status !== UserStatus.ACTIVE) {
    throw new AppError(403, "Customer account is not active", {
      code: "CUSTOMER_NOT_ACTIVE",
    });
  }

  if (booking.status !== BookingStatus.ACCEPTED) {
    throw new AppError(
      409,
      "Payment can only be created for an accepted booking",
      {
        code: "BOOKING_NOT_ACCEPTED",
        currentStatus: booking.status,
      },
    );
  }

  if (!booking.customer.phone) {
    throw new AppError(
      400,
      "Add a phone number to your account before payment",
      {
        code: "CUSTOMER_PHONE_REQUIRED",
      },
    );
  }

  const amount = Number(booking.amount);

  if (amount < 10 || amount > 500000) {
    throw new AppError(
      400,
      "Booking amount is outside the SSLCommerz payment range",
      {
        code: "INVALID_PAYMENT_AMOUNT",
        minimum: 10,
        maximum: 500000,
      },
    );
  }

  const completedPayment = await prisma.payment.findFirst({
    where: {
      bookingId: booking.id,
      status: PaymentStatus.COMPLETED,
    },
    select: {
      id: true,
    },
  });

  if (completedPayment) {
    throw new AppError(409, "This booking has already been paid", {
      code: "BOOKING_ALREADY_PAID",
    });
  }

  await prisma.payment.updateMany({
    where: {
      bookingId: booking.id,
      status: PaymentStatus.PENDING,
    },
    data: {
      status: PaymentStatus.CANCELLED,
    },
  });

  const transactionId = createTransactionId();

  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      customerId,
      transactionId,
      amount: booking.amount,
      currency: "BDT",
      status: PaymentStatus.PENDING,
    },
  });

  const callbackBase = `${env.APP_BASE_URL}/api/payments`;

  try {
    const gatewayResponse = await initiateSslCommerzPayment({
      store_id: env.SSLCOMMERZ_STORE_ID,
      store_passwd: env.SSLCOMMERZ_STORE_PASSWORD,
      total_amount: amount.toFixed(2),
      currency: "BDT",
      tran_id: transactionId,
      success_url: `${callbackBase}/success`,
      fail_url: `${callbackBase}/fail`,
      cancel_url: `${callbackBase}/cancel`,
      ipn_url: `${callbackBase}/ipn`,
      cus_name: booking.customer.name.slice(0, 50),
      cus_email: booking.customer.email.slice(0, 50),
      cus_add1: booking.address.slice(0, 50),
      cus_city: input.city.slice(0, 50),
      cus_state: input.city.slice(0, 50),
      cus_postcode: input.postcode.slice(0, 30),
      cus_country: "Bangladesh",
      cus_phone: booking.customer.phone.slice(0, 20),
      shipping_method: "NO",
      product_name: booking.service.name.slice(0, 255),
      product_category: booking.service.category.name.slice(0, 50),
      product_profile: "non-physical-goods",
      emi_option: "0",
      value_a: booking.id,
      value_b: customerId,
    });

    if (
      gatewayResponse.status !== "SUCCESS" ||
      !gatewayResponse.GatewayPageURL
    ) {
      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: PaymentStatus.FAILED,
          gatewayResponse: toJson(gatewayResponse),
        },
      });

      throw new AppError(
        502,
        gatewayResponse.failedreason ||
          "SSLCommerz could not create the payment session",
        {
          code: "PAYMENT_SESSION_FAILED",
        },
      );
    }

    const updatedPayment = await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        sessionKey: gatewayResponse.sessionkey ?? null,
        gatewayResponse: toJson(gatewayResponse),
      },
      select: paymentSelect,
    });

    return {
      payment: updatedPayment,
      gatewayPageUrl: gatewayResponse.GatewayPageURL,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: PaymentStatus.FAILED,
      },
    });

    throw new AppError(502, "Could not initialize the payment gateway", {
      code: "PAYMENT_GATEWAY_UNAVAILABLE",
    });
  }
};

const updateUnsuccessfulPayment = async (
  transactionId: string,
  status: "FAILED" | "CANCELLED",
  body: Record<string, unknown>,
) => {
  const payment = await prisma.payment.findUnique({
    where: {
      transactionId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!payment) {
    throw new AppError(404, "Payment transaction was not found", {
      code: "PAYMENT_NOT_FOUND",
    });
  }

  if (payment.status === PaymentStatus.COMPLETED) {
    return {
      transactionId,
      status: PaymentStatus.COMPLETED,
    };
  }

  await prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      status,
      gatewayResponse: body as Prisma.InputJsonValue,
    },
  });

  return {
    transactionId,
    status,
  };
};

export const processFailedPayment = async (body: Record<string, unknown>) => {
  const transactionId = getText(body, "tran_id");

  if (!transactionId) {
    throw new AppError(400, "Transaction ID is required", {
      code: "TRANSACTION_ID_REQUIRED",
    });
  }

  return updateUnsuccessfulPayment(transactionId, PaymentStatus.FAILED, body);
};

export const processCancelledPayment = async (
  body: Record<string, unknown>,
) => {
  const transactionId = getText(body, "tran_id");

  if (!transactionId) {
    throw new AppError(400, "Transaction ID is required", {
      code: "TRANSACTION_ID_REQUIRED",
    });
  }

  return updateUnsuccessfulPayment(
    transactionId,
    PaymentStatus.CANCELLED,
    body,
  );
};

export const processSuccessfulPayment = async (
  body: Record<string, unknown>,
) => {
  const transactionId = getText(body, "tran_id");
  const validationId = getText(body, "val_id");

  if (!transactionId || !validationId) {
    throw new AppError(400, "Transaction ID and validation ID are required", {
      code: "PAYMENT_VALIDATION_DATA_REQUIRED",
    });
  }

  const payment = await prisma.payment.findUnique({
    where: {
      transactionId,
    },
    select: {
      id: true,
      bookingId: true,
      transactionId: true,
      amount: true,
      currency: true,
      status: true,
    },
  });

  if (!payment) {
    throw new AppError(404, "Payment transaction was not found", {
      code: "PAYMENT_NOT_FOUND",
    });
  }

  if (payment.status === PaymentStatus.COMPLETED) {
    return {
      transactionId,
      status: PaymentStatus.COMPLETED,
      alreadyProcessed: true,
    };
  }

  const validation = await validateSslCommerzPayment(validationId);

  const validStatuses = ["VALID", "VALIDATED"];

  if (!validation.status || !validStatuses.includes(validation.status)) {
    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: PaymentStatus.FAILED,
        validationId,
        gatewayResponse: toJson(validation),
      },
    });

    throw new AppError(400, "Payment validation failed", {
      code: "PAYMENT_VALIDATION_FAILED",
      gatewayStatus: validation.status ?? null,
    });
  }

  if (validation.tran_id !== payment.transactionId) {
    throw new AppError(400, "Transaction ID does not match", {
      code: "PAYMENT_TRANSACTION_MISMATCH",
    });
  }

  const validatedAmount = Number(validation.amount);
  const expectedAmount = Number(payment.amount);

  if (
    !Number.isFinite(validatedAmount) ||
    Math.abs(validatedAmount - expectedAmount) > 0.01
  ) {
    throw new AppError(400, "Payment amount does not match", {
      code: "PAYMENT_AMOUNT_MISMATCH",
      expectedAmount,
      receivedAmount: validation.amount ?? null,
    });
  }

  if (validation.currency !== payment.currency) {
    throw new AppError(400, "Payment currency does not match", {
      code: "PAYMENT_CURRENCY_MISMATCH",
      expectedCurrency: payment.currency,
      receivedCurrency: validation.currency ?? null,
    });
  }

  if (String(validation.risk_level) === "1") {
    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        validationId,
        gatewayResponse: toJson(validation),
      },
    });

    return {
      transactionId,
      status: PaymentStatus.PENDING,
      underReview: true,
    };
  }

  return prisma.$transaction(async (transaction) => {
    const booking = await transaction.booking.findUnique({
      where: {
        id: payment.bookingId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!booking) {
      throw new AppError(404, "Booking was not found", {
        code: "BOOKING_NOT_FOUND",
      });
    }

    if (
      booking.status !== BookingStatus.ACCEPTED &&
      booking.status !== BookingStatus.PAID
    ) {
      throw new AppError(
        409,
        "Booking is not eligible for payment completion",
        {
          code: "BOOKING_NOT_PAYABLE",
          currentStatus: booking.status,
        },
      );
    }

    const updatedPayment = await transaction.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: PaymentStatus.COMPLETED,
        validationId,
        bankTransactionId: validation.bank_tran_id ?? null,
        method: validation.card_type ?? null,
        paidAt: new Date(),
        gatewayResponse: toJson(validation),
      },
      select: paymentSelect,
    });

    if (booking.status === BookingStatus.ACCEPTED) {
      await transaction.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          status: BookingStatus.PAID,
        },
      });
    }

    return {
      transactionId,
      status: PaymentStatus.COMPLETED,
      payment: updatedPayment,
    };
  });
};

export const processPaymentIpn = async (body: Record<string, unknown>) => {
  const status = getText(body, "status");

  if (status === "FAILED") {
    return processFailedPayment(body);
  }

  if (status === "CANCELLED") {
    return processCancelledPayment(body);
  }

  return processSuccessfulPayment(body);
};

export const getCustomerPayments = async (
  customerId: string,
  query: PaymentListQuery,
) => {
  const where: Prisma.PaymentWhereInput = {
    customerId,
    ...(query.status && {
      status: query.status,
    }),
  };

  const skip = (query.page - 1) * query.limit;

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        createdAt: "desc",
      },
      select: paymentSelect,
    }),

    prisma.payment.count({
      where,
    }),
  ]);

  return {
    payments,
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

export const getCustomerPaymentDetails = async (
  customerId: string,
  paymentId: string,
) => {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      customerId,
    },
    select: paymentSelect,
  });

  if (!payment) {
    throw new AppError(404, "Payment was not found", {
      code: "PAYMENT_NOT_FOUND",
    });
  }

  return payment;
};
