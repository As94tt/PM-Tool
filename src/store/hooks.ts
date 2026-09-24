"use client";

import { useAppStore } from "./app-store-provider";

export function useCurrentPerson() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const people = useAppStore((s) => s.people);
  return people.find((p) => p.id === currentUserId) ?? people[0];
}

export function useViewAsRole() {
  return useAppStore((s) => s.viewAsRole);
}
