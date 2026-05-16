import { ComingSoon } from "@/components/ComingSoon";

export default function AdminDashboardPage() {
  return (
    <ComingSoon
      eyebrow="Admin"
      title="Admin dashboard"
      description="Top-level metrics across users, attendance, leaves, and monthly payroll cost. Charts powered by Recharts will sit here once the aggregation queries land."
    />
  );
}
