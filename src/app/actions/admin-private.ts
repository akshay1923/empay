"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const dateOrEmpty = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .or(z.literal(""));

const schema = z.object({
  dob: dateOrEmpty.optional(),
  address: z.string().optional().or(z.literal("")),
  nationality: z.string().optional().or(z.literal("")),
  personalEmail: z.string().email("Valid email").or(z.literal("")).optional(),
  gender: z.string().optional().or(z.literal("")),
  maritalStatus: z.string().optional().or(z.literal("")),
  joinDate: dateOrEmpty.optional(),
  accountNumber: z.string().optional().or(z.literal("")),
  bankName: z.string().optional().or(z.literal("")),
  ifscCode: z.string().optional().or(z.literal("")),
  panNumber: z.string().optional().or(z.literal("")),
  uanNumber: z.string().optional().or(z.literal("")),
  employeeCode: z.string().optional().or(z.literal("")),
});

export async function updatePrivateInfo(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    const d = schema.parse(input);

    // Operational fields (joinDate, employeeCode) are HR/admin-managed.
    // Employees and Payroll Officers self-editing their own profile must
    // not be able to overwrite them, even if the form somehow submits a
    // value. Strip those from the write for non-officer callers.
    const canEditOperational =
      session.user.role === "ADMIN" || session.user.role === "HR_OFFICER";

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        dob: d.dob ? new Date(d.dob + "T00:00:00.000Z") : null,
        address: d.address?.trim() || null,
        nationality: d.nationality?.trim() || null,
        personalEmail: d.personalEmail?.trim() || null,
        gender: d.gender?.trim() || null,
        maritalStatus: d.maritalStatus?.trim() || null,
        accountNumber: d.accountNumber?.trim() || null,
        bankName: d.bankName?.trim() || null,
        ifscCode: d.ifscCode?.trim().toUpperCase() || null,
        panNumber: d.panNumber?.trim().toUpperCase() || null,
        uanNumber: d.uanNumber?.trim() || null,
        ...(canEditOperational
          ? {
              joinDate: d.joinDate ? new Date(d.joinDate + "T00:00:00.000Z") : null,
              employeeCode: d.employeeCode?.trim() || null,
            }
          : {}),
      },
    });
    revalidatePath("/admin/profile");
    revalidatePath("/employee/profile");
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
