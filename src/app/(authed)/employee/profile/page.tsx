import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RoleBadge } from "@/components/RoleBadge";
import { EmployeeProfileTabs } from "@/components/employee/profile/EmployeeProfileTabs";
import { decryptInt } from "@/lib/crypto/payroll";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      salaryStructures: { orderBy: { effectiveFrom: "desc" }, take: 1 },
    },
  });
  if (!user) return null;
  const salary = user.salaryStructures[0];

  return (
    <div className="space-y-7 max-w-[840px]">
      <div>
        <div className="text-eyebrow mb-1">Profile</div>
        <h1 className="h-display-m">{user.fullName}</h1>
        <div
          className="mt-2 flex flex-wrap items-center gap-3 text-[13px]"
          style={{ color: "var(--fg-muted)" }}
        >
          <RoleBadge role={user.role} />
          {user.loginId && <span className="font-mono">{user.loginId}</span>}
          {user.employeeCode && <span>· {user.employeeCode}</span>}
          {user.designation && <span>· {user.designation}</span>}
          {user.department && <span>· {user.department}</span>}
        </div>
      </div>

      <EmployeeProfileTabs
        about={{
          email: user.email,
          phone: user.phone,
          department: user.department,
          designation: user.designation,
          companyName: user.companyName,
          joinDate: user.joinDate ? user.joinDate.toISOString().slice(0, 10) : null,
        }}
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
        compensation={
          salary
            ? {
                ctcAnnual: decryptInt(salary.ctcAnnual),
                basicPercent: salary.basicPercent,
                hraPercent: salary.hraPercent,
                effectiveFrom: salary.effectiveFrom.toISOString().slice(0, 10),
              }
            : null
        }
      />
    </div>
  );
}
