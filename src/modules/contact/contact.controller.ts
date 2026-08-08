import type { Request, Response } from "express";

import { catchAsync } from "../../utils/catch-async.js";
import type { CreateContactInput } from "./contact.schema.js";
import { createContactMessage } from "./contact.service.js";

export const submitContactMessage = catchAsync(
  async (req: Request, res: Response) => {
    const input = req.body as CreateContactInput;

    const contact = await createContactMessage(input);

    res.status(201).json({
      success: true,
      message:
        "Your message has been received. We will get back to you soon.",
      data: contact,
    });
  },
);