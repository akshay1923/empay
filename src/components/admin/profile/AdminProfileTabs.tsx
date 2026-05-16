"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { ResumeTab } from "./ResumeTab";
import { PrivateInfoTab, type PrivateInfoInitial } from "./PrivateInfoTab";
import { SalaryInfoTab, type SalaryInitial } from "./SalaryInfoTab";
import { SecurityTab, type SecurityTabProps } from "./SecurityTab";
import type { SalaryTemplateRow } from "@/components/admin/settings/types";

export function AdminProfileTabs({
  resume,
  privateInfo,
  salary,
  salaryTemplates,
  security,
}: {
  resume: { about: string | null; jobLove: string | null; hobbies: string | null };
  privateInfo: PrivateInfoInitial;
  salary: SalaryInitial;
  salaryTemplates: SalaryTemplateRow[];
  security: SecurityTabProps;
}) {
  return (
    <div className="card p-7" style={{ boxShadow: "var(--shadow-2)" }}>
      <Tabs.Root defaultValue="resume">
        <Tabs.List
          className="flex gap-1 border-b mb-6 -mt-1"
          style={{ borderColor: "var(--border-hairline)" }}
        >
          <Tab value="resume">Resume</Tab>
          <Tab value="private">Private Info</Tab>
          <Tab value="salary">Salary Info</Tab>
          <Tab value="security">Security</Tab>
        </Tabs.List>

        <Tabs.Content value="resume" className="outline-none">
          <ResumeTab initial={resume} />
        </Tabs.Content>
        <Tabs.Content value="private" className="outline-none">
          <PrivateInfoTab initial={privateInfo} />
        </Tabs.Content>
        <Tabs.Content value="salary" className="outline-none">
          <SalaryInfoTab initial={salary} templates={salaryTemplates} />
        </Tabs.Content>
        <Tabs.Content value="security" className="outline-none">
          <SecurityTab {...security} />
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
