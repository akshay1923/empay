import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { defaultRouteForRole } from "@/lib/auth/permissions";
import { Logo } from "@/components/Logo";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const session = await auth();
  if (session) redirect(defaultRouteForRole(session.user.role));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <header className="px-8 h-16 flex items-center justify-between border-b border-border-hairline">
        <Logo />
        <div className="flex items-center gap-3">
          <span className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
            Already on EmPay?
          </span>
          <Link href="/login" className="btn btn-secondary">
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[440px]">
          <div className="mb-8 text-center">
            <h1 className="h-display-m mb-2">Create your EmPay account</h1>
            <p className="text-[14px]" style={{ color: "var(--fg-muted)" }}>
              Sign up is for company officers — Admin, HR, or Payroll. Employees
              are created by HR and receive their credentials directly.
            </p>
          </div>
          <div
            className="card p-7"
            style={{ boxShadow: "var(--shadow-3)" }}
          >
            <SignupForm />
          </div>
          <p
            className="mt-5 text-[12px] text-center"
            style={{ color: "var(--fg-faint)" }}
          >
            By creating an account, you agree to the EmPay terms of use.
          </p>
        </div>
      </main>
    </div>
  );
}
