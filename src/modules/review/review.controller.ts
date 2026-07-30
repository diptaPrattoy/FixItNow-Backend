import type { Request, Response } from "express";

import { catchAsync } from "../../utils/catch-async.js";
import type { CreateReviewInput } from "./review.schema.js";
import { createCustomerReview } from "./review.service.js";

export const createReview = catchAsync(
  async (req: Request, res: Response) => {
    const input = req.body as CreateReviewInput;

    const review = await createCustomerReview(
      req.user!.id,
      input,
    );

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review,
    });
  },
);