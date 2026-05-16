"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { ResumeTab } from "@/components/admin/profile/ResumeTab";
import {
  PrivateInfoTab,
  type PrivateInfoInitial,
} from "@/components/admin/profile/PrivateInfoTab";
import { ChangePasswordForm } from "@/app/(authed)/employee/profile/change-password-form";

type AboutInfo = {
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  companyName: string | null;
  joinDate: string | null;
};

type Compensation = {
  ctcAnnual: number;
  basicPercent: number;
  hraPercent: number;
  effectiveFrom: string;
};

export function EmployeeProfileTabs({
  about,
  resume,
  privateInfo,
  compensation,
}: {
  about: AboutInfo;
  resume: { about: string | null; jobLove: string | null; hobbies: string | null };
  privateInfo: PrivateInfoInitial;
  compensation: Compensation | null;
}) {
  return (
    <div className="card p-7" style={{ boxShadow: "var(--shadow-2)" }}>
      <Tabs.Root defaultValue="about">
        <Tabs.List
          className="flex gap-1 border-b mb-6 -mt-1"
          style={{ borderColor: "var(--border-hairline)" }}
        >
          <Tab value="about">About</Tab>
          <Tab value="resume">Resume</Tab>
          <Tab value="private">Private info</Tab>
          <Tab value="compensation">Compensation</Tab>
          <Tab value="security">Security</Tab>
        </Tabs.List>

        <Tabs.Content value="about" className="outline-none">
          <AboutTab about={about} />
        </Tabs.Content>
        <Tabs.Content value="resume" className="outline-none">
          <ResumeTab initial={resume} />
        </Tabs.Content>
        <Tabs.Content value="private" className="outline-none">
          <PrivateInfoTab
            initial={privateInfo}
            canEditOperationalFields={false}
          />
        </Tabs.Content>
        <Tabs.Content value="compensation" className="outline-none">
          <CompensationView compensation={compensation} />
        </Tabs.Content>
        <Tabs.Content value="security" className="outline-none">
          <ChangePasswordForm />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function AboutTab({ about }: { about: AboutInfo }) {
  return (
    <div className="space-y-2">
      <div
        className="text-[12px]"
        style={{ color: "var(--fg-muted)" }}
      >
        Basic info managed by HR. Reach out to them for changes here.
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-4">
        <Row label="Email" value={about.email} />
        <Row label="Phone" value={about.phone || "—"} />
        <Row label="Department" value={about.department || "—"} />
        <Row label="Designation" value={about.designation || "—"} />
        <Row
          label="Joined"
          value={
            about.joinDate
              ? new Date(about.joinDate + "T00:00:00.000Z").toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "long", year: "numeric" }
                )
              : "—"
          }
        />
        <Row label="Company" value={about.companyName || "Odoo India"} />
      </dl>
    </div>
  );
}

function CompensationView({
  compensation,
}: {
  compensation: Compensation | null;
}) {
  if (!compensation) {
    return (
      <div
        className="rounded-md p-8 text-center text-[13px]"
        style={{ background: "var(--bg-soft)", color: "var(--fg-muted)" }}
      >
        No salary structure on record yet. Your Payroll Officer will set this
        up before the first pay run.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        <Row
          label="Annual CTC"
          value={`₹${(compensation.ctcAnnual / 100).toLocaleString("en-IN")}`}
        />
        <Row
          label="Basic %"
          value={`${(compensation.basicPercent * 100).toFixed(0)}%`}
        />
        <Row
          label="HRA % of Basic"
          value={`${(compensation.hraPercent * 100).toFixed(0)}%`}
        />
        <Row
          label="Effective from"
          value={new Date(
            compensation.effectiveFrom + "T00:00:00.000Z"
          ).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        />
      </dl>
      <p
        className="text-[12px] mt-5 pt-4"
        style={{
          color: "var(--fg-faint)",
          borderTop: "1px solid var(--border-hairline)",
        }}
      >
        Compensation is set by the Payroll Officer. To request a change,
        contact HR.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] mb-0.5" style={{ color: "var(--fg-muted)" }}>
        {label}
      </dt>
      <dd className="text-[14px]">{value}</dd>
    </div>
  );
}

function Tab({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <Tabs.Trigger
      value={value}
      className="px-4 py-2 text-[13px] -mb-px border-b-2 border-transparent data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--fg)] text-[var(--fg-muted)] outline-none transition-colors"
    >
      {children}
    </Tabs.Trigger>
  );
}
