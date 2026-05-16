"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";

const templateSchema = z.object({
  name: z.string().trim().min(2, "Name required"),
  description: z.string().trim().optional().or(z.literal("")),
  basicPercent: z.number().min(0).max(1),
  hraPercent: z.number().min(0).max(1),
  standardAllowancePercent: z.number().min(0).max(1),
  performanceBonusPercent: z.number().min(0).max(1),
  ltaPercent: z.number().min(0).max(1),
  pfEmployeePercent: z.number().min(0).max(1),
  pfEmployerPercent: z.number().min(0).max(1),
  professionalTax: z.number().int().min(0),
  workingDaysPerWeek: z.number().int().min(1).max(7),
  breakTimeHours: z.number().min(0).max(8),
});

export type SalaryTemplateInput = z.infer<typeof templateSchema>;

export async function createSalaryTemplate(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "salary_structure", "create");
    const data = templateSchema.parse(input);

    const existing = await prisma.salaryStructureTemplate.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      return {
        success: false as const,
        error: `A structure named "${data.name}" already exists`,
      };
    }

    const t = await prisma.salaryStructureTemplate.create({
      data: {
        name: data.name,
        description: data.description?.trim() || null,
        basicPercent: data.basicPercent,
        hraPercent: data.hraPercent,
        standardAllowancePercent: data.standardAllowancePercent,
        performanceBonusPercent: data.performanceBonusPercent,
        ltaPercent: data.ltaPercent,
        pfEmployeePercent: data.pfEmployeePercent,
        pfEmployerPercent: data.pfEmployerPercent,
        professionalTax: data.professionalTax,
        workingDaysPerWeek: data.workingDaysPerWeek,
        breakTimeHours: data.breakTimeHours,
        createdById: session.user.id,
      },
    });

    revalidatePath("/admin/settings");
    return { success: true as const, id: t.id };
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

const updateSchema = templateSchema.extend({ id: z.string().min(1) });

export async function updateSalaryTemplate(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "salary_structure", "update");
    const data = updateSchema.parse(input);

    const existing = await prisma.salaryStructureTemplate.findUnique({
      where: { id: data.id },
    });
    if (!existing) {
      return { success: false as const, error: "Template not found" };
    }

    if (data.name !== existing.name) {
      const conflict = await prisma.salaryStructureTemplate.findUnique({
        where: { name: data.name },
      });
      if (conflict && conflict.id !== existing.id) {
        return {
          success: false as const,
          error: `A structure named "${data.name}" already exists`,
        };
      }
    }

    await prisma.salaryStructureTemplate.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        description: data.description?.trim() || null,
        basicPercent: data.basicPercent,
        hraPercent: data.hraPercent,
        standardAllowancePercent: data.standardAllowancePercent,
        performanceBonusPercent: data.performanceBonusPercent,
        ltaPercent: data.ltaPercent,
        pfEmployeePercent: data.pfEmployeePercent,
        pfEmployerPercent: data.pfEmployerPercent,
        professionalTax: data.professionalTax,
        workingDaysPerWeek: data.workingDaysPerWeek,
        breakTimeHours: data.breakTimeHours,
      },
    });

    revalidatePath("/admin/settings");
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

export async function deleteSalaryTemplate(id: string) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "salary_structure", "delete");
    await prisma.salaryStructureTemplate.delete({ where: { id } });
    revalidatePath("/admin/settings");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
