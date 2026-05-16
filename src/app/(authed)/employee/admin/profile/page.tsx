import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminProfileForm } from "@/components/admin/AdminProfileForm";
import { AdminProfileTabs } from "@/components/admin/profile/AdminProfileTabs";
import { decryptInt } from "@/lib/crypto/payroll";

export const dynamic = "force-dynamic";

const SALARY_DEFAULTS = {
  monthWagePaise: 0,
  basicPercent: 0.5,
  hraPercent: 0.5,
  standardAllowancePercent: 0.1667,
  performanceBonusPercent: 0.0833,
  ltaPercent: 0.0833,
  pfEmployeePercent: 0.12,
  pfEmployerPercent: 0.12,
  professionalTaxPaise: 20000,
  workingDaysPerWeek: 6,
  breakTimeHours: 1,
};

export default async function AdminProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [user, salary, employees, salaryTemplates] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        fullName: true,
        loginId: true,
        email: true,
        phone: true,
        companyName: true,
        department: true,
        managerName: true,
        address: true,
        about: true,
        jobLove: true,
        hobbies: true,
        dob: true,
        nationality: true,
        personalEmail: true,
        gender: true,
        maritalStatus: true,
        joinDate: true,
        accountNumber: true,
        bankName: true,
        ifscCode: true,
        panNumber: true,
        uanNumber: true,
        employeeCode: true,
      },
    }),
    prisma.salaryStructure.findFirst({
      where: { userId: session.user.id, effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "EMPLOYEE", isActive: true, id: { not: session.user.id } },
      select: { id: true, loginId: true, fullName: true, email: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.salaryStructureTemplate.findMany({
      orderBy: { name: "asc" },
    }),
  ]);
  if (!user) redirect("/login");

  const salaryCtcAnnual = salary ? decryptInt(salary.ctcAnnual) : 0;
  const salaryInitial = salary
    ? {
        monthWagePaise: Math.round(salaryCtcAnnual / 12),
        basicPercent: salary.basicPercent,
        hraPercent: salary.hraPercent,
        standardAllowancePercent: salary.standardAllowancePercent,
        performanceBonusPercent: salary.performanceBonusPercent,
        ltaPercent: salary.ltaPercent,
        pfEmployeePercent: salary.pfEmployeePercent,
        pfEmployerPercent: salary.pfEmployerPercent,
        professionalTaxPaise: salary.professionalTax,
        workingDaysPerWeek: salary.workingDaysPerWeek,
        breakTimeHours: salary.breakTimeHours,
      }
    : SALARY_DEFAULTS;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-eyebrow mb-1">Profile</div>
        <h1 className="h-display-m">My profile</h1>
      </div>

      <AdminProfileForm
        initial={{
          fullName: user.fullName,
          loginId: user.loginId,
          email: user.email,
          phone: user.phone,
          companyName: user.companyName,
          department: user.department,
          managerName: user.managerName,
          address: user.address,
        }}
      />

      <AdminProfileTabs
        resume={{
          about: user.about,
          jobLove: user.jobLove,
          hobbies: user.hobbies,
        }}
        privateInfo={{
          dob: user.dob ? user.dob.toISOString().slice(0, 10) : null,
          address: user.address,
          nationality: user.nationality,
          personalEmail: user.personalEmail,
          gender: user.gender,
          maritalStatus: user.maritalStatus,
          joinDate: user.joinDate ? user.joinDate.toISOString().slice(0, 10) : null,
          accountNumber: user.accountNumber,
          bankName: user.bankName,
          ifscCode: user.ifscCode,
          panNumber: user.panNumber,
          uanNumber: user.uanNumber,
          employeeCode: user.employeeCode,
        }}
        salary={{
          monthWagePaise: salaryInitial.monthWagePaise,
          basicPercent: salaryInitial.basicPercent,
          hraPercent: salaryInitial.hraPercent,
          standardAllowancePercent: salaryInitial.standardAllowancePercent,
          performanceBonusPercent: salaryInitial.performanceBonusPercent,
          ltaPercent: salaryInitial.ltaPercent,
          pfEmployeePercent: salaryInitial.pfEmployeePercent,
          pfEmployerPercent: salaryInitial.pfEmployerPercent,
          professionalTaxPaise: salaryInitial.professionalTaxPaise,
          workingDaysPerWeek: salaryInitial.workingDaysPerWeek,
          breakTimeHours: salaryInitial.breakTimeHours,
        }}
        salaryTemplates={salaryTemplates.map((t) => ({
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
        }))}
        security={{
          loginId: user.loginId,
          email: user.email,
          employees,
        }}
      />
    </div>
  );
}
