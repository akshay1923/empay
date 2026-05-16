"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { allocateLoginId, generateTempPassword } from "@/lib/auth/login-id";
import { requirePermission } from "@/lib/auth/permissions";
import { sendCredentialsEmail } from "@/lib/mailer";
import { encryptInt } from "@/lib/crypto/payroll";

const employeeSchema = z.object({
  fullName: z.string().min(2, "Full name required"),
  email: z.string().email("Valid email required"),
  department: z.string().min(1, "Department required"),
  designation: z.string().min(1, "Designation required"),
  joinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  ctcAnnual: z
    .number({ invalid_type_error: "CTC must be a number" })
    .int()
    .positive("CTC must be > 0"),
  phone: z.string().optional().or(z.literal("")),
  salaryTemplateId: z.string().optional().or(z.literal("")),
});

export type CreateEmployeeInput = z.infer<typeof employeeSchema>;

type CreatedEmployee = {
  loginId: string;
  fullName: string;
  email: string;
  tempPassword: string;
  emailSent: boolean;
  emailError?: string;
};

/**
 * Create the employee + salary structure rows. Does NOT send the welcome
 * email — the caller decides whether to send it inline (single-create UI
 * needs immediate feedback) or queue it for background delivery (bulk
 * import doesn't block the response on N SMTP roundtrips).
 */
async function createEmployeeRecord(
  input: CreateEmployeeInput,
  createdById: string
): Promise<{
  loginId: string;
  fullName: string;
  email: string;
  tempPassword: string;
}> {
  const data = employeeSchema.parse(input);

  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });
  if (existing) {
    throw new Error(`Email already in use: ${data.email}`);
  }

  const joinDate = new Date(data.joinDate + "T00:00:00.000Z");
  const { loginId, year } = await allocateLoginId({
    fullName: data.fullName,
    joinDate,
  });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      loginId,
      fullName: data.fullName,
      role: Role.EMPLOYEE,
      passwordHash,
      department: data.department,
      designation: data.designation,
      phone: data.phone || null,
      joinDate,
      joinYear: year,
    },
  });

  const template = data.salaryTemplateId
    ? await prisma.salaryStructureTemplate.findUnique({
        where: { id: data.salaryTemplateId },
      })
    : null;

  await prisma.salaryStructure.create({
    data: {
      userId: user.id,
      ctcAnnual: encryptInt(data.ctcAnnual),
      effectiveFrom: joinDate,
      createdById,
      ...(template
        ? {
            basicPercent: template.basicPercent,
            hraPercent: template.hraPercent,
            standardAllowancePercent: template.standardAllowancePercent,
            performanceBonusPercent: template.performanceBonusPercent,
            ltaPercent: template.ltaPercent,
            pfEmployeePercent: template.pfEmployeePercent,
            pfEmployerPercent: template.pfEmployerPercent,
            professionalTax: template.professionalTax,
            workingDaysPerWeek: template.workingDaysPerWeek,
            breakTimeHours: template.breakTimeHours,
          }
        : {}),
    },
  });

  return {
    loginId,
    fullName: user.fullName,
    email: user.email,
    tempPassword,
  };
}

async function createOne(
  input: CreateEmployeeInput,
  createdById: string
): Promise<CreatedEmployee> {
  const rec = await createEmployeeRecord(input, createdById);
  const mail = await sendCredentialsEmail({
    to: rec.email,
    fullName: rec.fullName,
    loginId: rec.loginId,
    tempPassword: rec.tempPassword,
  });
  return {
    ...rec,
    emailSent: mail.ok,
    emailError: mail.ok ? undefined : mail.error,
  };
}

export async function createEmployee(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "employee_profile", "create");
    const data = employeeSchema.parse(input);
    const created = await createOne(data, session.user.id);
    revalidatePath("/admin/employees");
    return { success: true as const, employee: created };
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

const updateSchema = employeeSchema.extend({
  userId: z.string().min(1),
});

export async function updateEmployee(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "employee_profile", "update");
    const data = updateSchema.parse(input);

    const existing = await prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!existing || existing.role !== "EMPLOYEE") {
      return { success: false as const, error: "Employee not found" };
    }

    const newEmail = data.email.toLowerCase();
    if (newEmail !== existing.email) {
      const conflict = await prisma.user.findUnique({ where: { email: newEmail } });
      if (conflict && conflict.id !== existing.id) {
        return { success: false as const, error: "Email already in use" };
      }
    }

    const joinDate = new Date(data.joinDate + "T00:00:00.000Z");

    await prisma.user.update({
      where: { id: existing.id },
      data: {
        fullName: data.fullName.trim(),
        email: newEmail,
        department: data.department.trim(),
        designation: data.designation.trim(),
        phone: data.phone?.trim() || null,
        joinDate,
        joinYear: joinDate.getFullYear(),
      },
    });

    // Sync the active salary structure. CTC is always kept in lock-step
    // with the form. If a template was picked, overwrite the structure's
    // percentages and rules with that template's values so the change
    // takes effect for existing employees.
    const template = data.salaryTemplateId
      ? await prisma.salaryStructureTemplate.findUnique({
          where: { id: data.salaryTemplateId },
        })
      : null;
    const tplData = template
      ? {
          basicPercent: template.basicPercent,
          hraPercent: template.hraPercent,
          standardAllowancePercent: template.standardAllowancePercent,
          performanceBonusPercent: template.performanceBonusPercent,
          ltaPercent: template.ltaPercent,
          pfEmployeePercent: template.pfEmployeePercent,
          pfEmployerPercent: template.pfEmployerPercent,
          professionalTax: template.professionalTax,
          workingDaysPerWeek: template.workingDaysPerWeek,
          breakTimeHours: template.breakTimeHours,
        }
      : {};

    const activeSalary = await prisma.salaryStructure.findFirst({
      where: { userId: existing.id, effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
    });
    if (activeSalary) {
      await prisma.salaryStructure.update({
        where: { id: activeSalary.id },
        data: {
          ctcAnnual: encryptInt(data.ctcAnnual),
          ...tplData,
        },
      });
    } else {
      await prisma.salaryStructure.create({
        data: {
          userId: existing.id,
          createdById: session.user.id,
          ctcAnnual: encryptInt(data.ctcAnnual),
          effectiveFrom: joinDate,
          ...tplData,
        },
      });
    }

    revalidatePath("/admin/employees");
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

export async function deleteEmployee(userId: string) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "employee_profile", "delete");
  } catch {
    return { success: false as const, error: "Forbidden" };
  }
  try {
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.role !== "EMPLOYEE") {
      return { success: false as const, error: "Employee not found" };
    }
    if (target.id === session.user.id) {
      return { success: false as const, error: "You can't delete yourself" };
    }
    // Cascades remove SalaryStructure, Attendance, LeaveAllocation, LeaveRequest,
    // and Payslip rows for this user. LeaveRequest.approvedBy becomes NULL on
    // any other leaves they had approved.
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/admin/employees");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

type ImportedEmployeeSummary = {
  loginId: string;
  fullName: string;
  email: string;
  tempPassword: string;
};

type ImportRowResult =
  | { row: number; ok: true; employee: ImportedEmployeeSummary }
  | { row: number; ok: false; error: string; input: Partial<CreateEmployeeInput> };

/**
 * Bulk-import employees from a CSV. Two-phase by design:
 *
 *   1. Insert every valid row synchronously (DB writes only — fast).
 *   2. Schedule the welcome emails via next/server `after()` so the
 *      response flushes immediately and SMTP latency stays out of the
 *      request path.
 *
 * `after()` keeps the lambda alive on Vercel until the queued work
 * finishes; on a long-lived Node server it just runs after the response.
 */
export async function importEmployeesCsv(rows: Partial<CreateEmployeeInput>[]) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "employee_profile", "create");
  } catch {
    return { success: false as const, error: "Forbidden" };
  }

  const results: ImportRowResult[] = [];
  const pendingEmails: ImportedEmployeeSummary[] = [];

  // Catch in-CSV duplicate emails up-front — Postgres would fail the
  // second insert with a unique-constraint violation, but a clean
  // pre-check gives a better error message and keeps the row index right.
  const seenEmails = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    try {
      const parsed = employeeSchema.parse({
        fullName: (raw.fullName ?? "").toString().trim(),
        email: (raw.email ?? "").toString().trim(),
        department: (raw.department ?? "").toString().trim(),
        designation: (raw.designation ?? "").toString().trim(),
        joinDate: (raw.joinDate ?? "").toString().trim(),
        ctcAnnual:
          typeof raw.ctcAnnual === "number"
            ? raw.ctcAnnual
            : Number((raw.ctcAnnual ?? "").toString().replace(/[^\d]/g, "")),
        phone: (raw.phone ?? "").toString().trim(),
      });
      const emailKey = parsed.email.toLowerCase();
      if (seenEmails.has(emailKey)) {
        throw new Error(`Duplicate email in CSV: ${parsed.email}`);
      }
      seenEmails.add(emailKey);

      const employee = await createEmployeeRecord(parsed, session.user.id);
      pendingEmails.push(employee);
      results.push({ row: i + 1, ok: true, employee });
    } catch (e) {
      const msg =
        e instanceof z.ZodError
          ? e.issues[0]?.message ?? "Invalid row"
          : e instanceof Error
          ? e.message
          : "Unknown error";
      results.push({ row: i + 1, ok: false, error: msg, input: raw });
    }
  }

  revalidatePath("/admin/employees");
  revalidatePath("/hr/employees");

  // Queue the welcome emails. We send serially so a flaky SMTP server
  // doesn't open N concurrent connections, and we never let one
  // failure short-circuit the rest.
  if (pendingEmails.length > 0) {
    after(async () => {
      for (const e of pendingEmails) {
        try {
          await sendCredentialsEmail({
            to: e.email,
            fullName: e.fullName,
            loginId: e.loginId,
            tempPassword: e.tempPassword,
          });
        } catch (err) {
          console.error(
            `[bulk-import] welcome email failed for ${e.email}:`,
            err
          );
        }
      }
    });
  }

  return {
    success: true as const,
    results,
    emailsQueued: pendingEmails.length,
  };
}
