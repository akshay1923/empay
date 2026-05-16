"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { PasswordInput } from "@/components/PasswordInput";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signIn("credentials", {
        identifier: identifier.trim(),
        password,
        redirect: false,
      });
      if (!res || res.error) {
        setError("Those credentials don't match any active account.");
        return;
      }
      router.push(callbackUrl || "/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="identifier">
          Login ID or work email
        </label>
        <input
          id="identifier"
          name="identifier"
          autoComplete="username"
          autoFocus
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="OIANME20250001 or you@company.com"
          className="input input-lg"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="input-lg"
        />
      </div>

      {error && (
        <div
          className="text-[13px] px-3 py-2 rounded-2"
          style={{
            background: "var(--bg-tinted-red)",
            color: "var(--accent-text)",
            boxShadow: "inset 0 0 0 1px var(--accent-soft)",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-lg btn-block"
      >
        {pending ? "Signing in…" : "Continue"}
      </button>

      <button
        type="button"
        className="btn btn-tinted btn-lg btn-block"
        onClick={() => {
          setIdentifier("ananya@empay.com");
          setPassword("emp123");
        }}
      >
        Continue with demo employee
      </button>
    </form>
  );
}
