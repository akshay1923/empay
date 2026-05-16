import type { Role } from "@prisma/client";

export type Resource =
  | "user"
  | "employee_profile"
  | "attendance_own"
  | "attendance_all"
  | "leave_request"
  | "leave_approve"
  | "leave_balance_allocate"
  | "salary_structure"
  | "payslip_generate"
  | "payslip_view_own"
  | "payslip_view_all"
  | "reports"
  | "settings";

export type Action = "create" | "read" | "update" | "delete";

const PERMISSIONS: Record<Role, Partial<Record<Resource, Action[]>>> = {
  ADMIN: {
    user: ["create", "read", "update", "delete"],
    employee_profile: ["create", "read", "update", "delete"],
    attendance_all: ["create", "read", "update", "delete"],
    attendance_own: ["create", "read"],
    leave_request: ["create", "read", "update", "delete"],
    leave_approve: ["update"],
    leave_balance_allocate: ["create", "update"],
    salary_structure: ["create", "read", "update", "delete"],
    payslip_generate: ["create"],
    payslip_view_all: ["read"],
    reports: ["read"],
    settings: ["create", "read", "update", "delete"],
  },
  HR_OFFICER: {
    employee_profile: ["create", "read", "update"],
    user: ["create"], // HR creates employees (auto-loginId)
    attendance_all: ["read"],
    leave_request: ["read"],
    leave_balance_allocate: ["create", "update"],
  },
  PAYROLL_OFFICER: {
    employee_profile: ["read"],
    attendance_all: ["read"],
    leave_request: ["read"],
    leave_approve: ["update"],
    salary_structure: ["create", "read", "update"],
    payslip_generate: ["create"],
    payslip_view_all: ["read"],
    reports: ["read"],
  },
  EMPLOYEE: {
    employee_profile: ["read"],
    attendance_own: ["create", "read"],
    leave_request: ["create", "read"],
    payslip_view_own: ["read"],
  },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  return PERMISSIONS[role]?.[resource]?.includes(action) ?? false;
}

export function requirePermission(role: Role, resource: Resource, action: Action) {
  if (!can(role, resource, action)) {
    throw new Error(`Forbidden: ${role} cannot ${action} ${resource}`);
  }
}

/** Where a role lands after login. */
export function defaultRouteForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/employees";
    case "HR_OFFICER":
      return "/hr/dashboard";
    case "PAYROLL_OFFICER":
      return "/payroll/dashboard";
    case "EMPLOYEE":
    default:
      return "/employee/dashboard";
  }
}
