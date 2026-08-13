import bcrypt from "bcryptjs";

import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";
import { UserRole, UserStatus } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken } from "../../utils/jwt.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";
import cloudinary from "../../lib/cloudinary.js";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  technicianProfile: {
    select: {
      id: true,
      bio: true,
      experienceYears: true,
      location: true,
      averageRating: true,
      reviewCount: true,
      isVerified: true,
    },
  },
} as const;

export const registerUser = async (input: RegisterInput) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new AppError(409, "An account with this email already exists", {
      code: "EMAIL_ALREADY_EXISTS",
      field: "email",
    });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      phone: input.phone ?? null,
      role: input.role,
      technicianProfile:
        input.role === UserRole.TECHNICIAN
          ? {
              create: {
                location: input.location!,
              },
            }
          : undefined,
    },
    select: publicUserSelect,
  });

  return {
    user,
    accessToken: signAccessToken(user.id, user.role),
    expiresIn: env.JWT_EXPIRES_IN,
  };
};

export const loginUser = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      ...publicUserSelect,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new AppError(401, "Email or password is incorrect", {
      code: "INVALID_CREDENTIALS",
    });
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError(401, "Email or password is incorrect", {
      code: "INVALID_CREDENTIALS",
    });
  }

  if (user.status === UserStatus.BANNED) {
    throw new AppError(403, "Your account has been banned", {
      code: "ACCOUNT_BANNED",
    });
  }

  const { passwordHash, ...safeUser } = user;

  return {
    user: safeUser,
    accessToken: signAccessToken(user.id, user.role),
    expiresIn: env.JWT_EXPIRES_IN,
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: publicUserSelect,
  });

  if (!user) {
    throw new AppError(404, "User was not found", {
      code: "USER_NOT_FOUND",
    });
  }

  return user;
};
export const updateCurrentUser = async (
  userId: string,
  input: {
    name?: string;
    phone?: string | null;
    bio?: string | null;
    experienceYears?: number;
    location?: string;
  },
) => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      technicianProfile: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!existingUser) {
    throw new AppError(404, "User was not found", {
      code: "USER_NOT_FOUND",
    });
  }

  const user = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      ...(input.name !== undefined && {
        name: input.name,
      }),

      ...(input.phone !== undefined && {
        phone: input.phone,
      }),
    },
    select: publicUserSelect,
  });

  if (
    existingUser.role === UserRole.TECHNICIAN &&
    existingUser.technicianProfile
  ) {
    await prisma.technicianProfile.update({
      where: {
        userId,
      },
      data: {
        ...(input.bio !== undefined && {
          bio: input.bio,
        }),

        ...(input.experienceYears !== undefined && {
          experienceYears: input.experienceYears,
        }),

        ...(input.location !== undefined && {
          location: input.location,
        }),
      },
    });
  }

  return getCurrentUser(userId);
};
export const updateUserAvatar = async (
  userId: string,
  file: Express.Multer.File,
): Promise<string> => {
  try {
    const avatarUrl = await new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "fixitnow/avatars",
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result?.secure_url) {
            reject(new Error("Cloudinary did not return an image URL"));
            return;
          }

          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatarUrl,
      },
    });

    return avatarUrl;
  } catch (error) {
    console.error("Avatar upload failed:", error);

    throw new AppError(500, "Failed to upload profile picture", {
      code: "AVATAR_UPLOAD_FAILED",
    });
  }
};
