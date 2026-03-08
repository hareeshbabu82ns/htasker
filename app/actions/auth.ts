"use server";

import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db/prisma";
import { auth, signOut } from "@/auth";
import { revalidatePath } from "next/cache";

export type AuthActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

const RegisterSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Register a new user with email and password
 */
export async function registerUser(
  data: RegisterInput
): Promise<AuthActionResponse<{ id: string }>> {
  try {
    const validated = RegisterSchema.parse(data);

    const existing = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existing) {
      return { success: false, error: "An account with this email already exists" };
    }

    const hashedPassword = await bcrypt.hash(validated.password, 12);

    const user = await prisma.user.create({
      data: {
        name: validated.name ?? null,
        email: validated.email,
        password: hashedPassword,
      },
    });

    return { success: true, data: { id: user.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => e.message).join(", "),
      };
    }
    console.error("Error registering user:", error);
    return { success: false, error: "Registration failed. Please try again." };
  }
}

const UpdateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  image: z.string().url("Invalid URL").optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/**
 * Update the authenticated user's profile
 */
export async function updateUserProfile(
  data: UpdateProfileInput
): Promise<AuthActionResponse<{ id: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validated = UpdateProfileSchema.parse(data);

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: validated.name,
        image: validated.image ?? null,
      },
    });

    revalidatePath("/settings/profile");

    return { success: true, data: { id: user.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => e.message).join(", "),
      };
    }
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

/**
 * Sign out the currently authenticated user and redirect to login
 */
export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
