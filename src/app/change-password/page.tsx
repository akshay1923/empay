import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/Logo";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const forced = session.user.mustChangePassword;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <header
        className="px-8 h-16 flex items-center border-b"
        style={{ borderColor: "var(--border-hairline)" }}
      >
        <Logo />
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px]">
          <div className="mb-7">
            <div className="text-eyebrow mb-2">
              {forced ? "Welcome to EmPay" : "Account security"}
            </div>
            <h1 className="h-display-s mb-3">
              {forced ? "Set your password" : "Change your password"}
            </h1>
            <p
              className="text-[14px] leading-[1.55]"
              style={{ color: "var(--fg-muted)" }}
            >
              {forced ? (
                <>
                  Hi {session.user.name.split(" ")[0]}, please replace the
                  temporary password we emailed you with one of your own to
                  continue.
                </>
              ) : (
                <>
                  Pick a strong new password. You&apos;ll be signed out after
                  the change so the new credentials take effect.
                </>
              )}
            </p>
          </div>

          <div
            className="rounded-md px-3 py-2 mb-5 text-[12px] font-mono"
            style={{
              background: "var(--bg-soft)",
              color: "var(--fg-muted)",
            }}
          >
            <span style={{ color: "var(--fg-faint)" }}>Login ID · </span>
            {session.user.loginId ?? session.user.email}
          </div>

          <ChangePasswordForm />
        </div>
      </main>
    </div>
  );
}
