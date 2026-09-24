"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LogoMark } from "@/components/shared/logo-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "nexus-pm-tool-unlocked";
const PASSWORD = "POCpmtool";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let value = false;
    try {
      value = localStorage.getItem(STORAGE_KEY) === "true";
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
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // localStorage unavailable (private browsing, etc.) — stay unlocked for this session only
      }
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
