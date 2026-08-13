import bcrypt from "bcryptjs";

import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";
import { UserRole, UserStatus } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken } from "../../utils/jwt.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";
import cloudinary from "../../lib/cloudinary.js";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const loginWithGoogle = async (credential: string) => {
  if (!credential) {
    throw new AppError(400, "Google credential is required", {
      code: "GOOGLE_CREDENTIAL_REQUIRED",
    });
  }

  let ticket;

  try {
    ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
  } catch {
    throw new AppError(401, "Invalid Google credential", {
      code: "INVALID_GOOGLE_CREDENTIAL",
    });
  }

  const payload = ticket.getPayload();

  if (!payload) {
    throw new AppError(401, "Invalid Google account information", {
      code: "INVALID_GOOGLE_ACCOUNT",
    });
  }

  const googleId = payload.sub;
  const email = payload.email;
  const googleName = payload.name;
  const picture = payload.picture;

  if (!googleId || !email) {
    throw new AppError(401, "Google account information is incomplete", {
      code: "GOOGLE_ACCOUNT_INCOMPLETE",
    });
  }

  if (payload.email_verified !== true) {
    throw new AppError(401, "Google email address is not verified", {
      code: "GOOGLE_EMAIL_NOT_VERIFIED",
    });
  }

  // --------------------------------------------------
  // 1. Find existing user by Google ID
  // --------------------------------------------------

  let user = await prisma.user.findUnique({
    where: {
      googleId,
    },
    select: publicUserSelect,
  });

  // --------------------------------------------------
  // 2. Google ID doesn't exist
  // --------------------------------------------------

  if (!user) {
    // Check whether an account with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        googleId: true,
      },
    });

    if (existingUser) {
      // Connect Google account to existing account
      user = await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          googleId,
          ...(picture ? { avatarUrl: picture } : {}),
        },
        select: publicUserSelect,
      });
    } else {
      // Create a new CUSTOMER account
      const newUser = await prisma.user.create({
        data: {
          name: googleName?.trim() || email.split("@")[0] || "Google User",

          email,
          googleId,
          passwordHash: null,
          avatarUrl: picture ?? null,
          role: UserRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
        select: publicUserSelect,
      });

      user = newUser;
    }
  }

  // --------------------------------------------------
  // 3. Make sure TypeScript knows user exists
  // --------------------------------------------------

  if (!user) {
    throw new AppError(500, "Unable to create or retrieve user", {
      code: "GOOGLE_USER_RESOLUTION_FAILED",
    });
  }

  // --------------------------------------------------
  // 4. Check account status
  // --------------------------------------------------

  if (user.status === UserStatus.BANNED) {
    throw new AppError(403, "Your account has been banned", {
      code: "ACCOUNT_BANNED",
    });
  }

  // --------------------------------------------------
  // 5. Generate JWT
  // --------------------------------------------------

  return {
    user,
    accessToken: signAccessToken(user.id, user.role),
    expiresIn: env.JWT_EXPIRES_IN,
  };
};
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
  if (!user.passwordHash) {
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
