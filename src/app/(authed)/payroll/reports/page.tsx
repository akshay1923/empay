import { prisma } from "@/lib/prisma";
import { SalaryStatementForm } from "@/components/admin/reports/SalaryStatementForm";

export const dynamic = "force-dynamic";

export default async function PayrollOfficerReportsPage() {
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, loginId: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="text-eyebrow mb-1">Reports</div>
        <h1 className="h-display-m">Reports</h1>
      </div>

      <SalaryStatementForm
        employees={employees.map((e) => ({
          id: e.id,
          fullName: e.fullName,
          loginId: e.loginId,
        }))}
      />
    </div>
  );
}
