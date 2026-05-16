"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { signOut } from "next-auth/react";
import { LogOut, User as UserIcon } from "lucide-react";
import type { Role } from "@prisma/client";
import { RoleBadge } from "@/components/RoleBadge";

export function UserMenu({
  user,
  profileHref,
}: {
  user: { name: string; email: string; role: Role; loginId: string | null };
  profileHref: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-[var(--bg-hover)] outline-none"
          aria-label="Account menu"
        >
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-medium"
            style={{
              background: "rgba(113,75,103,0.12)",
              color: "var(--accent-text)",
            }}
          >
            {initials(user.name)}
          </div>
          <div className="leading-tight text-left">
            <div className="text-[13px] font-medium" style={{ color: "var(--fg)" }}>
              {user.name}
            </div>
            <div className="text-[11px]" style={{ color: "var(--fg-muted)" }}>
              <RoleBadge role={user.role} />
            </div>
          </div>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="min-w-[220px] rounded-md border p-1 shadow-md z-50"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border-hairline)",
            boxShadow: "var(--shadow-3)",
          }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border-hairline)" }}>
            <div className="text-[13px] font-medium truncate">{user.name}</div>
            <div className="text-[11px] truncate" style={{ color: "var(--fg-muted)" }}>
              {user.loginId ? (
                <>
                  <span className="font-mono">{user.loginId}</span> · {user.email}
                </>
              ) : (
                user.email
              )}
            </div>
          </div>
          <DropdownMenu.Item asChild>
            <Link
              href={profileHref}
              className="flex items-center gap-2 px-3 py-2 text-[13px] rounded-sm cursor-pointer outline-none data-[highlighted]:bg-[var(--bg-hover)]"
            >
              <UserIcon size={14} />
              My profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              signOut({ callbackUrl: "/login" });
            }}
            className="flex items-center gap-2 px-3 py-2 text-[13px] rounded-sm cursor-pointer outline-none data-[highlighted]:bg-[var(--bg-hover)]"
          >
            <LogOut size={14} />
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}
