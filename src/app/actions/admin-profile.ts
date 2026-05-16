"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  fullName: z.string().min(2, "Name is required"),
  phone: z.string().optional().or(z.literal("")),
  companyName: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
  managerName: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

export async function updateAdminProfile(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    const data = schema.parse(input);
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        fullName: data.fullName.trim(),
        phone: data.phone?.trim() || null,
        companyName: data.companyName?.trim() || null,
        department: data.department?.trim() || null,
        managerName: data.managerName?.trim() || null,
        address: data.address?.trim() || null,
      },
    });
    revalidatePath("/admin", "layout");
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
