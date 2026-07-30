import type { Request, Response } from "express";

import { catchAsync } from "../../utils/catch-async.js";
import type {
  ServiceQuery,
  TechnicianParams,
  TechnicianQuery,
} from "./public.schema.js";
import {
  getCategories,
  getServices,
  getTechnicianDetails,
  getTechnicians,
} from "./public.service.js";

export const listCategories = catchAsync(
  async (_req: Request, res: Response) => {
    const categories = await getCategories();

    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: categories,
    });
  },
);

export const listServices = catchAsync(
  async (req: Request, res: Response) => {
    const query = req.validated?.query as ServiceQuery;
    const result = await getServices(query);

    res.status(200).json({
      success: true,
      message: "Services retrieved successfully",
      data: result.services,
      meta: result.pagination,
    });
  },
);

export const listTechnicians = catchAsync(
  async (req: Request, res: Response) => {
    const query = req.validated?.query as TechnicianQuery;
    const result = await getTechnicians(query);

    res.status(200).json({
      success: true,
      message: "Technicians retrieved successfully",
      data: result.technicians,
      meta: result.pagination,
    });
  },
);

export const technicianDetails = catchAsync(
  async (req: Request, res: Response) => {
    const params = req.validated?.params as TechnicianParams;
    const technician = await getTechnicianDetails(params.id);

    res.status(200).json({
      success: true,
      message: "Technician retrieved successfully",
      data: technician,
    });
  },
);