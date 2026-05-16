import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { defaultRouteForRole } from "@/lib/auth/permissions";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const session = await auth();
  if (session) {
    redirect(callbackUrl || defaultRouteForRole(session.user.role));
  }
 
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <header className="px-8 h-16 flex items-center justify-between border-b border-border-hairline">
        <Logo />
        <div className="flex items-center gap-3">
          <span className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
            Don&apos;t have an account?
          </span>
          <Link href="/signup" className="btn btn-secondary">
            Create account
          </Link>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_440px]">
        {/* Marketing column — Notion-style hero */}
        <section
          className="hidden lg:flex flex-col justify-between px-12 py-12"
          style={{ background: "var(--bg-soft)" }}
        >
          <div className="max-w-[520px]">
            <div className="text-eyebrow mb-3">Smart HRMS</div>
            <h1 className="h-display-l mb-5">
              Attendance, leave, &amp; payroll. Together.
            </h1>
            <p
              className="text-[16px] leading-[1.65]"
              style={{ color: "var(--fg-muted)" }}
            >
              EmPay is the connected workspace for people operations — every
              payslip is grounded in the attendance an employee marked and the
              leave a manager approved.
            </p>
          </div>

          {/* Demo credentials card — judges see this on the login page */}
          <div
            className="card p-5 max-w-[520px] mt-12"
            style={{ boxShadow: "var(--shadow-3)" }}
          >
            <div
              className="text-[11px] uppercase tracking-wider mb-3"
              style={{ color: "var(--fg-muted)", letterSpacing: "0.08em" }}
            >
              Demo credentials
            </div>
            <ul className="space-y-1.5 text-[13px] font-mono">
              
              <li>
                <span style={{ color: "var(--fg-muted)" }}>Admin —</span>{" "}
                admin@empay.com / admin123
              </li>
             
              <li>
                <span style={{ color: "var(--fg-muted)" }}>HR —</span>{" "}
                hr@empay.com / hr123
              </li>
              <li>
                <span style={{ color: "var(--fg-muted)" }}>Payroll —</span>{" "}
                payroll@empay.com / payroll123
              </li>
              <li>
                <span style={{ color: "var(--fg-muted)" }}>Employee —</span>{" "}
                ananya@empay.com / emp123
              </li>
              <li>
                <span style={{ color: "var(--fg-muted)" }}>Login ID —</span>{" "}
                OIANME20250001 / emp123
              </li>
            </ul>
          </div>
        </section>

        {/* Form column */}
        <section className="flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-[360px]">
            <div className="mb-8">
              <h2 className="h-display-s mb-2">Sign in to EmPay</h2>
              <p className="text-[14px]" style={{ color: "var(--fg-muted)" }}>
                Use your login ID or work email to continue.
              </p>
            </div>
            <LoginForm callbackUrl={callbackUrl} />
            <div
              className="mt-6 text-[12px]"
              style={{ color: "var(--fg-faint)" }}
            >
              By continuing, you acknowledge the EmPay terms of use and that
              your session is signed with a JWT issued by our auth service.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
