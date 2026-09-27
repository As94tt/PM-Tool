"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LogoMark } from "@/components/shared/logo-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/app-store-provider";
import { ROLE_LABEL } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/types";

export const AUTH_STORAGE_KEY = "nexus-pm-tool-unlocked";
const PASSWORD = "POCpmtool";
const ROLE_OPTIONS: AppRole[] = ["user", "management", "admin"];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const setViewAsRole = useAppStore((s) => s.setViewAsRole);
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("user");
  const [error, setError] = useState(false);

  useEffect(() => {
    let value = false;
    try {
      value = localStorage.getItem(AUTH_STORAGE_KEY) === "true";
    } catch {
      value = false;
    }
    // localStorage is only available client-side; reading it here (rather
    // than a lazy useState initializer) deliberately avoids a server/client
    // hydration mismatch, since the server has no way to know the value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnlocked(value);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password === PASSWORD) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, "true");
      } catch {
        // localStorage unavailable (private browsing, etc.) — stay unlocked for this session only
      }
      // Stands in for a real SSO claim until the company SSO is wired up —
      // for now, the role is simply picked at login, not tied to identity.
      setViewAsRole(selectedRole);
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setPassword("");
    }
  }

  if (unlocked === null) {
    return <div className="min-h-svh bg-background" />;
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4">
        <div className="flex items-center gap-2 text-foreground">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <LogoMark className="size-5" />
          </div>
          <span className="font-heading text-lg font-semibold tracking-tight">Nexus</span>
        </div>
        <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
          <div>
            <p className="mb-1.5 text-center text-xs text-muted-foreground">Log in as</p>
            <div className="flex rounded-lg border border-border p-1">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    selectedRole === r
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
          <Input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Password"
            aria-invalid={error}
            className="text-center"
          />
          {error && <p className="text-center text-xs text-destructive">Incorrect password.</p>}
          <Button type="submit" className="w-full">
            Enter
          </Button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
