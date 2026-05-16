"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  Plane,
  FileText,
  User,
  Users,
  Wallet,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavSection = { title: string; items: NavItem[] };

const NAV: Record<Role, NavSection[]> = {
  EMPLOYEE: [
    {
      title: "Workspace",
      items: [
        { href: "/employee/dashboard", label: "Home", icon: Home },
        { href: "/employee/attendance", label: "Attendance", icon: Calendar },
        { href: "/employee/payslips", label: "Payslips", icon: FileText },
      ],
    },
    {
      title: "Account",
      items: [{ href: "/employee/profile", label: "Profile", icon: User }],
    },
  ],
  HR_OFFICER: [
    {
      title: "HR",
      items: [
        { href: "/hr/dashboard", label: "Dashboard", icon: Home },
        { href: "/hr/employees", label: "Employees", icon: Users },
        { href: "/hr/attendance", label: "Attendance", icon: Calendar },
        { href: "/hr/leaves", label: "Leaves", icon: Plane },
      ],
    },
    {
      title: "Personal",
      items: [
        { href: "/employee/dashboard", label: "My workspace", icon: User },
      ],
    },
  ],
  PAYROLL_OFFICER: [
    {
      title: "Payroll",
      items: [
        { href: "/payroll/dashboard", label: "Dashboard", icon: Home },
        { href: "/payroll/attendance", label: "Attendance", icon: Calendar },
        { href: "/payroll/timeoff", label: "Time off", icon: Plane },
        { href: "/payroll/payroll", label: "Payroll", icon: Wallet },
        { href: "/payroll/reports", label: "Reports", icon: BarChart3 },
      ],
    },
    {
      title: "Personal",
      items: [
        { href: "/employee/dashboard", label: "My workspace", icon: User },
      ],
    },
  ],
  ADMIN: [
    {
      title: "Admin",
      items: [
        { href: "/admin/employees", label: "Employee", icon: Users },
        { href: "/admin/attendance", label: "Attendance", icon: Calendar },
        { href: "/admin/timeoff", label: "Timeoff", icon: Plane },
        { href: "/admin/payroll", label: "Payroll", icon: Wallet },
        { href: "/admin/reports", label: "Reports", icon: BarChart3 },
        { href: "/admin/settings", label: "Settings", icon: Settings },
      ],
    },
  ],
};

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const sections = NAV[role];

  return (
    <aside
      className="hidden md:flex flex-col w-[256px] shrink-0 px-3 py-4 border-r"
      style={{ background: "var(--bg-soft)", borderColor: "var(--border-hairline)" }}
    >
      <div className="px-2 pb-4">
        <Logo />
      </div>

      <nav className="flex-1 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="mb-2">
            <div className="nav-section">{section.title}</div>
            <div className="flex flex-col gap-px">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("nav-item", active && "nav-item-active")}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div
        className="text-[11px] px-2 pt-3 mt-3"
        style={{ color: "var(--fg-faint)", borderTop: "1px solid var(--border-hairline)" }}
      >
        EmPay v0.1 · Odoo India
      </div>
    </aside>
  );
}
