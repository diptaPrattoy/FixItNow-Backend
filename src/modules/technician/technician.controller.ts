import type { Request, Response } from "express";

import { catchAsync } from "../../utils/catch-async.js";
import type {
  AvailabilityQuery,
  CreateAvailabilityInput,
  CreateServiceInput,
  IdParams,
  UpdateAvailabilityInput,
  UpdateProfileInput,
  UpdateServiceInput,
} from "./technician.schema.js";
import {
  createTechnicianAvailability,
  createTechnicianService,
  deactivateTechnicianService,
  deleteTechnicianAvailability,
  getOwnAvailability,
  getOwnProfile,
  getOwnServices,
  updateOwnProfile,
  updateTechnicianAvailability,
  updateTechnicianService,
} from "./technician.service.js";

export const getProfile = catchAsync(
  async (req: Request, res: Response) => {
    const profile = await getOwnProfile(req.user!.id);

    res.status(200).json({
      success: true,
      message: "Technician profile retrieved successfully",
      data: profile,
    });
  },
);

export const updateProfile = catchAsync(
  async (req: Request, res: Response) => {
    const input = req.body as UpdateProfileInput;
    const profile = await updateOwnProfile(req.user!.id, input);

    res.status(200).json({
      success: true,
      message: "Technician profile updated successfully",
      data: profile,
    });
  },
);

export const createService = catchAsync(
  async (req: Request, res: Response) => {
    const input = req.body as CreateServiceInput;

    const service = await createTechnicianService(
      req.user!.id,
      input,
    );

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: service,
    });
  },
);

export const listServices = catchAsync(
  async (req: Request, res: Response) => {
    const services = await getOwnServices(req.user!.id);

    res.status(200).json({
      success: true,
      message: "Technician services retrieved successfully",
      data: services,
    });
  },
);

export const updateService = catchAsync(
  async (req: Request, res: Response) => {
    const params = req.validated?.params as IdParams;
    const input = req.body as UpdateServiceInput;

    const service = await updateTechnicianService(
      req.user!.id,
      params.id,
      input,
    );

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: service,
    });
  },
);

export const deleteService = catchAsync(
  async (req: Request, res: Response) => {
    const params = req.validated?.params as IdParams;

    const service = await deactivateTechnicianService(
      req.user!.id,
      params.id,
    );

    res.status(200).json({
      success: true,
      message: "Service deactivated successfully",
      data: service,
    });
  },
);

export const createAvailability = catchAsync(
  async (req: Request, res: Response) => {
    const input = req.body as CreateAvailabilityInput;

    const availability = await createTechnicianAvailability(
      req.user!.id,
      input,
    );

    res.status(201).json({
      success: true,
      message: "Availability created successfully",
      data: availability,
    });
  },
);

export const listAvailability = catchAsync(
  async (req: Request, res: Response) => {
    const query = req.validated?.query as AvailabilityQuery;

    const result = await getOwnAvailability(
      req.user!.id,
      query,
    );

    res.status(200).json({
      success: true,
      message: "Availability retrieved successfully",
      data: result.availability,
      meta: result.pagination,
    });
  },
);

export const updateAvailability = catchAsync(
  async (req: Request, res: Response) => {
    const params = req.validated?.params as IdParams;
    const input = req.body as UpdateAvailabilityInput;

    const availability = await updateTechnicianAvailability(
      req.user!.id,
      params.id,
      input,
    );

    res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      data: availability,
    });
  },
);

export const deleteAvailability = catchAsync(
  async (req: Request, res: Response) => {
    const params = req.validated?.params as IdParams;

    const availability = await deleteTechnicianAvailability(
      req.user!.id,
      params.id,
    );

    res.status(200).json({
      success: true,
      message: "Availability deleted successfully",
      data: availability,
    });
  },
);