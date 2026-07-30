import type { Request, Response } from "express";

import { catchAsync } from "../../utils/catch-async.js";
import type {
  BookingListQuery,
  BookingParams,
  CancelBookingInput,
  CreateBookingInput,
  TechnicianBookingUpdateInput,
} from "./booking.schema.js";
import {
  cancelCustomerBooking,
  createCustomerBooking,
  getCustomerBookingDetails,
  getCustomerBookings,
  getTechnicianBookingDetails,
  getTechnicianBookings,
  updateTechnicianBookingStatus,
} from "./booking.service.js";

export const createBooking = catchAsync(
  async (req: Request, res: Response) => {
    const input = req.body as CreateBookingInput;

    const booking = await createCustomerBooking(
      req.user!.id,
      input,
    );

    res.status(201).json({
      success: true,
      message: "Booking requested successfully",
      data: booking,
    });
  },
);

export const listCustomerBookings = catchAsync(
  async (req: Request, res: Response) => {
    const query = req.validated?.query as BookingListQuery;

    const result = await getCustomerBookings(
      req.user!.id,
      query,
    );

    res.status(200).json({
      success: true,
      message: "Bookings retrieved successfully",
      data: result.bookings,
      meta: result.pagination,
    });
  },
);

export const customerBookingDetails = catchAsync(
  async (req: Request, res: Response) => {
    const params = req.validated?.params as BookingParams;

    const booking = await getCustomerBookingDetails(
      req.user!.id,
      params.id,
    );

    res.status(200).json({
      success: true,
      message: "Booking retrieved successfully",
      data: booking,
    });
  },
);

export const cancelBooking = catchAsync(
  async (req: Request, res: Response) => {
    const params = req.validated?.params as BookingParams;
    const input = req.body as CancelBookingInput;

    const booking = await cancelCustomerBooking(
      req.user!.id,
      params.id,
      input,
    );

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });
  },
);

export const listTechnicianBookings = catchAsync(
  async (req: Request, res: Response) => {
    const query = req.validated?.query as BookingListQuery;

    const result = await getTechnicianBookings(
      req.user!.id,
      query,
    );

    res.status(200).json({
      success: true,
      message: "Technician bookings retrieved successfully",
      data: result.bookings,
      meta: result.pagination,
    });
  },
);

export const technicianBookingDetails = catchAsync(
  async (req: Request, res: Response) => {
    const params = req.validated?.params as BookingParams;

    const booking = await getTechnicianBookingDetails(
      req.user!.id,
      params.id,
    );

    res.status(200).json({
      success: true,
      message: "Booking retrieved successfully",
      data: booking,
    });
  },
);

export const updateTechnicianBooking = catchAsync(
  async (req: Request, res: Response) => {
    const params = req.validated?.params as BookingParams;
    const input = req.body as TechnicianBookingUpdateInput;

    const booking = await updateTechnicianBookingStatus(
      req.user!.id,
      params.id,
      input,
    );

    res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      data: booking,
    });
  },
);