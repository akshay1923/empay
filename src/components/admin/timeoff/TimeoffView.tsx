"use client";

import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { RequestsTab } from "./RequestsTab";
import { AllocationTab } from "./AllocationTab";
import type {
  AllocationRow,
  EmployeeOption,
  LeaveRequestRow,
  LeaveSummary,
} from "./types";

type TabKey = "requests" | "allocation";

export function TimeoffView({
  tab,
  year,
  requests,
  allocations,
  summaries,
  employees,
  basePath = "/admin/timeoff",
  canApprove = true,
  canCreateRequest = true,
  showAllocationTab = true,
}: {
  tab: TabKey;
  year: number;
  requests: LeaveRequestRow[];
  allocations: AllocationRow[];
  summaries: LeaveSummary[];
  employees: EmployeeOption[];
  basePath?: string;
  canApprove?: boolean;
  canCreateRequest?: boolean;
  showAllocationTab?: boolean;
}) {
  const router = useRouter();
  const setTab = (next: TabKey) => {
    const qs = new URLSearchParams();
    if (next === "allocation") qs.set("tab", "allocation");
    if (year !== new Date().getFullYear()) qs.set("year", String(year));
    router.push(`${basePath}${qs.toString() ? "?" + qs.toString() : ""}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-eyebrow mb-1">Time off</div>
        <h1 className="h-display-m">Time off</h1>
      </div>

      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <Tabs.List
          className="flex gap-1 border-b mb-6"
          style={{ borderColor: "var(--border-hairline)" }}
        >
          <Tab value="requests">Time Off</Tab>
          {showAllocationTab && <Tab value="allocation">Allocation</Tab>}
        </Tabs.List>

        <Tabs.Content value="requests" className="outline-none">
          <RequestsTab
            requests={requests}
            summaries={summaries}
            employees={employees}
            year={year}
            canApprove={canApprove}
            canCreateRequest={canCreateRequest}
          />
        </Tabs.Content>
        {showAllocationTab && (
          <Tabs.Content value="allocation" className="outline-none">
            <AllocationTab
              allocations={allocations}
              employees={employees}
              year={year}
              basePath={basePath}
            />
          </Tabs.Content>
        )}
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
