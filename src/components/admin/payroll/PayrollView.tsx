"use client";

import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { DashboardTab } from "./DashboardTab";
import { PayrunTab } from "./PayrunTab";
import type {
  DashboardData,
  EmployeeOption,
  PayRunSummary,
  PayslipRow,
} from "./types";

type TabKey = "dashboard" | "payrun";

export function PayrollView({
  tab,
  dashboard,
  payruns,
  selected,
  payslips,
  employees,
  basePath = "/admin/payroll",
}: {
  tab: TabKey;
  dashboard: DashboardData;
  payruns: PayRunSummary[];
  selected: PayRunSummary | null;
  payslips: PayslipRow[];
  employees: EmployeeOption[];
  basePath?: string;
}) {
  const router = useRouter();
  const setTab = (next: TabKey) => {
    if (next === "dashboard") router.push(basePath);
    else router.push(`${basePath}?tab=payrun`);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-eyebrow mb-1">Payroll</div>
        <h1 className="h-display-m">Payroll</h1>
      </div>

      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <Tabs.List
          className="flex gap-1 border-b mb-6"
          style={{ borderColor: "var(--border-hairline)" }}
        >
          <Tab value="dashboard">Dashboard</Tab>
          <Tab value="payrun">Payrun</Tab>
        </Tabs.List>

        <Tabs.Content value="dashboard" className="outline-none">
          <DashboardTab data={dashboard} basePath={basePath} />
        </Tabs.Content>
        <Tabs.Content value="payrun" className="outline-none">
          <PayrunTab
            payruns={payruns}
            selected={selected}
            payslips={payslips}
            employees={employees}
            basePath={basePath}
          />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function Tab({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <Tabs.Trigger
      value={value}
      className="px-4 py-2 text-[13px] -mb-px border-b-2 border-transparent data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--fg)] text-[var(--fg-muted)] outline-none transition-colors"
    >
      {children}
    </Tabs.Trigger>
  );
}
