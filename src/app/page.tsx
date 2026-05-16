import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { defaultRouteForRole } from "@/lib/auth/permissions";

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect("/login");
  redirect(defaultRouteForRole(session.user.role));
}
