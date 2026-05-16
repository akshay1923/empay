import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { FloatingAssistant } from "@/components/assistant/FloatingAssistant";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div
      className="flex h-screen"
      style={{ background: "var(--bg)" }}
    >
      <Sidebar role={session.user.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={{
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: session.user.role,
            loginId: session.user.loginId,
          }}
        />
        <main className="flex-1 overflow-auto">
          <div className="max-w-[1200px] mx-auto px-8 py-8">{children}</div>
        </main>
      </div>
      <FloatingAssistant role={session.user.role} />
    </div>
  );
}
