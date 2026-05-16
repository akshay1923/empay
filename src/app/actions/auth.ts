"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const officerSignupSchema = z
  .object({
    companyName: z.string().min(2),
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7).optional().or(z.literal("")),
    role: z.enum(["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER"]),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function signUpOfficer(input: unknown) {
  try {
    const data = officerSignupSchema.parse(input);
    const exists = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (exists) return { success: false as const, error: "Email already in use" };

    const passwordHash = await bcrypt.hash(data.password, 10);
    await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        fullName: data.fullName,
        role: data.role as Role,
        companyName: data.companyName,
        phone: data.phone || null,
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });
    return { success: true as const };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false as const, error: e.issues[0]?.message ?? "Invalid input" };
    }
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

const changePwSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function changePassword(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    const data = changePwSchema.parse(input);
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return { success: false as const, error: "User not found" };
    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) return { success: false as const, error: "Current password is incorrect" };
    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
    return { success: true as const };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false as const, error: e.issues[0]?.message ?? "Invalid input" };
    }
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
