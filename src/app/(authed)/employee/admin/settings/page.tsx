import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SalaryTemplatesPanel } from "@/components/admin/settings/SalaryTemplatesPanel";
import { UsersPanel, type UserRow } from "@/components/admin/settings/UsersPanel";
import type { SalaryTemplateRow } from "@/components/admin/settings/types";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [templates, users] = await Promise.all([
    prisma.salaryStructureTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
      select: {
        id: true,
        fullName: true,
        loginId: true,
        email: true,
        role: true,
        isActive: true,
      },
    }),
  ]);

  const rows: SalaryTemplateRow[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    basicPercent: t.basicPercent,
    hraPercent: t.hraPercent,
    standardAllowancePercent: t.standardAllowancePercent,
    performanceBonusPercent: t.performanceBonusPercent,
    ltaPercent: t.ltaPercent,
    pfEmployeePercent: t.pfEmployeePercent,
    pfEmployerPercent: t.pfEmployerPercent,
    professionalTax: t.professionalTax,
    workingDaysPerWeek: t.workingDaysPerWeek,
    breakTimeHours: t.breakTimeHours,
  }));

  const userRows: UserRow[] = users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    loginId: u.loginId,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-eyebrow mb-1">Settings</div>
        <h1 className="h-display-m">Workspace settings</h1>
      </div>

      <UsersPanel users={userRows} currentUserId={session.user.id} />
      <SalaryTemplatesPanel templates={rows} />
    </div>
  );
}
