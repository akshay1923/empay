import type { Role } from "@prisma/client";
import { humanizeEnum } from "@/lib/utils";

const TONE: Record<Role, string> = {
  ADMIN: "badge-accent",
  HR_OFFICER: "badge-secondary",
  PAYROLL_OFFICER: "badge-warning",
  EMPLOYEE: "badge",
};

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`badge ${TONE[role]}`}>{humanizeEnum(role)}</span>;
}
