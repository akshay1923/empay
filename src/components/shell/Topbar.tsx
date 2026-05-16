import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserMenu } from "@/components/shell/UserMenu";
import { CheckInToggle } from "@/components/shell/CheckInToggle";

function profileHrefFor(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/profile";
    case "HR_OFFICER":
    case "PAYROLL_OFFICER":
    case "EMPLOYEE":
    default:
      return "/employee/profile";
  }
}

async function getTodayAttendance(userId: string) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return prisma.attendance.findUnique({
    where: { userId_date: { userId, date } },
    select: { checkInAt: true, checkOutAt: true },
  });
}

export async function Topbar({
  user,
}: {
  user: { id: string; name: string; email: string; role: Role; loginId: string | null };
}) {
  const today = await getTodayAttendance(user.id);

  return (
    <header
      className="h-14 px-6 flex items-center justify-between border-b"
      style={{
        background: "var(--bg)",
        borderColor: "var(--border-hairline)",
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
          {user.loginId ? (
            <>
              <span className="font-mono">{user.loginId}</span> · {user.email}
            </>
          ) : (
            user.email
          )}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <CheckInToggle
          initial={{
            checkInAt: today?.checkInAt ? today.checkInAt.toISOString() : null,
            checkOutAt: today?.checkOutAt ? today.checkOutAt.toISOString() : null,
          }}
        />
        <UserMenu user={user} profileHref={profileHrefFor(user.role)} />
      </div>
    </header>
  );
}
