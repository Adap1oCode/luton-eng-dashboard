/**
 * Client-side access hook
 * 
 * Provides a React hook to fetch session data and build guards for client-side
 * permission checks and UI rendering.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { buildGuards, type SessionAccess } from "./guards";

type SessionResponse = {
  effectiveUser: {
    roleCode: string | null;
    roleFamily: string | null;
    permissions: string[];
  };
  allowedWarehouseCodes: string[];
};

/**
 * Hook to get access guards for the current user.
 * 
 * @returns Object with guards and loading state
 */
export function useAccess() {
  const { data: sessionData, isLoading } = useQuery<SessionResponse>({
    queryKey: ["session", "access"],
    queryFn: async () => {
      const res = await fetch("/api/me/role");
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  const access: SessionAccess | null = sessionData
    ? {
        roleCode: sessionData.effectiveUser?.roleCode ?? null,
        roleFamily: sessionData.effectiveUser?.roleFamily ?? null,
        permissions: sessionData.effectiveUser?.permissions ?? [],
        allowedWarehouseCodes: sessionData.allowedWarehouseCodes ?? [],
      }
    : null;

  const guards = access ? buildGuards(access) : null;

  return {
    guards,
    access,
    isLoading,
  };
}









