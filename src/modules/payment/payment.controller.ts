import type { Request, Response } from "express";

import { catchAsync } from "../../utils/catch-async.js";
import type {
  CreatePaymentInput,
  PaymentListQuery,
  PaymentParams,
} from "./payment.schema.js";
import {
  createPaymentSession,
  getCustomerPaymentDetails,
  getCustomerPayments,
  processCancelledPayment,
  processFailedPayment,
  processPaymentIpn,
  processSuccessfulPayment,
} from "./payment.service.js";

export const createPayment = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as CreatePaymentInput;

  const result = await createPaymentSession(req.user!.id, input);

  res.status(201).json({
    success: true,
    message: "Payment session created successfully",
    data: result,
  });
});

export const listPayments = catchAsync(async (req: Request, res: Response) => {
  const query = req.validated?.query as PaymentListQuery;

  const result = await getCustomerPayments(req.user!.id, query);

  res.status(200).json({
    success: true,
    message: "Payments retrieved successfully",
    data: result.payments,
    meta: result.pagination,
  });
});

export const paymentDetails = catchAsync(
  async (req: Request, res: Response) => {
    const params = req.validated?.params as PaymentParams;

    const payment = await getCustomerPaymentDetails(req.user!.id, params.id);

    res.status(200).json({
      success: true,
      message: "Payment retrieved successfully",
      data: payment,
    });
  },
);

export const paymentSuccess = catchAsync(
  async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = await processSuccessfulPayment(body);

    const underReview = "underReview" in result && result.underReview === true;

    res.status(200).json({
      success: true,
      message: underReview
        ? "Payment is under review"
        : "Payment completed successfully",
      data: result,
    });
  },
);

export const paymentFailed = catchAsync(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const result = await processFailedPayment(body);

  res.status(200).json({
    success: true,
    message: "Payment failure recorded",
    data: result,
  });
});

export const paymentCancelled = catchAsync(
  async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = await processCancelledPayment(body);

    res.status(200).json({
      success: true,
      message: "Payment cancellation recorded",
      data: result,
    });
  },
);

export const paymentIpn = catchAsync(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const result = await processPaymentIpn(body);
  res.status(200).json({
    success: true,
    message: "Payment notification processed",
    data: result,
  });
});
