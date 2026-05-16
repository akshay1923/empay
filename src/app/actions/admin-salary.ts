"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptInt } from "@/lib/crypto/payroll";

const schema = z.object({
  monthWagePaise: z.number().int().nonnegative(),
  basicPercent: z.number().min(0).max(1),
  hraPercent: z.number().min(0).max(1),
  standardAllowancePercent: z.number().min(0).max(1),
  performanceBonusPercent: z.number().min(0).max(1),
  ltaPercent: z.number().min(0).max(1),
  pfEmployeePercent: z.number().min(0).max(1),
  pfEmployerPercent: z.number().min(0).max(1),
  professionalTax: z.number().int().nonnegative(),
  workingDaysPerWeek: z.number().int().min(1).max(7),
  breakTimeHours: z.number().min(0).max(8),
});

export async function upsertSalaryStructure(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    const d = schema.parse(input);
    const ctcAnnual = d.monthWagePaise * 12;

    const existing = await prisma.salaryStructure.findFirst({
      where: { userId: session.user.id, effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
    });

    const data = {
      ctcAnnual: encryptInt(ctcAnnual),
      basicPercent: d.basicPercent,
      hraPercent: d.hraPercent,
      standardAllowancePercent: d.standardAllowancePercent,
      performanceBonusPercent: d.performanceBonusPercent,
      ltaPercent: d.ltaPercent,
      pfEmployeePercent: d.pfEmployeePercent,
      pfEmployerPercent: d.pfEmployerPercent,
      professionalTax: d.professionalTax,
      workingDaysPerWeek: d.workingDaysPerWeek,
      breakTimeHours: d.breakTimeHours,
    };

    if (existing) {
      await prisma.salaryStructure.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.salaryStructure.create({
        data: {
          userId: session.user.id,
          createdById: session.user.id,
          ...data,
        },
      });
    }

    revalidatePath("/admin/profile");
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
