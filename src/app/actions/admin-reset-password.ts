"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateTempPassword } from "@/lib/auth/login-id";
import { sendCredentialsEmail } from "@/lib/mailer";
import { requirePermission } from "@/lib/auth/permissions";

const schema = z.object({
  userId: z.string().min(1),
});

export async function resetEmployeePassword(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "user", "update");
  } catch {
    return { success: false as const, error: "Forbidden" };
  }

  try {
    const { userId } = schema.parse(input);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false as const, error: "User not found" };

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      // Clear passwordChangedAt so the next sign-in forces another reset.
      data: { passwordHash, passwordChangedAt: null },
    });

    if (!user.loginId) {
      return {
        success: false as const,
        error: "User has no login ID — cannot send credentials.",
      };
    }

    const mail = await sendCredentialsEmail({
      to: user.email,
      fullName: user.fullName,
      loginId: user.loginId,
      tempPassword,
    });

    return {
      success: true as const,
      tempPassword,
      emailSent: mail.ok,
      emailError: mail.ok ? undefined : mail.error,
    };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
