import type { Request, Response } from "express";

import { catchAsync } from "../../utils/catch-async.js";
import type {
  AdminBookingListQuery,
  AdminIdParams,
  AdminUserListQuery,
  CreateCategoryInput,
  UpdateCategoryInput,
  UpdateUserStatusInput,
} from "./admin.schema.js";
import {
  createAdminCategory,
  getAdminBookings,
  getAdminCategories,
  getAdminUsers,
  updateAdminCategory,
  updateAdminUserStatus,
} from "./admin.service.js";

export const listUsers = catchAsync(
  async (req: Request, res: Response) => {
    const query =
      req.validated?.query as AdminUserListQuery;

    const result = await getAdminUsers(query);

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: result.users,
      meta: result.pagination,
    });
  },
);

export const updateUserStatus = catchAsync(
  async (req: Request, res: Response) => {
    const params = req.validated?.params as AdminIdParams;
    const input = req.body as UpdateUserStatusInput;

    const user = await updateAdminUserStatus(
      req.user!.id,
      params.id,
      input,
    );

    res.status(200).json({
      success: true,
      message: `User ${input.status.toLowerCase()} successfully`,
      data: user,
    });
  },
);

export const listBookings = catchAsync(
  async (req: Request, res: Response) => {
    const query =
      req.validated?.query as AdminBookingListQuery;

    const result = await getAdminBookings(query);

    res.status(200).json({
      success: true,
      message: "Bookings retrieved successfully",
      data: result.bookings,
      meta: result.pagination,
    });
  },
);

export const listCategories = catchAsync(
  async (_req: Request, res: Response) => {
    const categories = await getAdminCategories();

    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: categories,
    });
  },
);

export const createCategory = catchAsync(
  async (req: Request, res: Response) => {
    const input = req.body as CreateCategoryInput;
    const category = await createAdminCategory(input);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  },
);

export const updateCategory = catchAsync(
  async (req: Request, res: Response) => {
    const params = req.validated?.params as AdminIdParams;
    const input = req.body as UpdateCategoryInput;

    const category = await updateAdminCategory(
      params.id,
      input,
    );

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  },
);