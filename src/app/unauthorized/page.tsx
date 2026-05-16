import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function UnauthorizedPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--bg)" }}
    >
      <Logo size={28} className="mb-8" />
      <div className="card p-10 text-center max-w-[440px]" style={{ boxShadow: "var(--shadow-3)" }}>
        <h1 className="h-display-s mb-2">You don&apos;t have access</h1>
        <p
          className="text-[14px] mb-6"
          style={{ color: "var(--fg-muted)" }}
        >
          This page is restricted to a different role. If you think this is a
          mistake, ask your admin to update your permissions.
        </p>
        <Link href="/" className="btn btn-primary btn-lg">
          Back to your workspace
        </Link>
      </div>
    </div>
  );
}
