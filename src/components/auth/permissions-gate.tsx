"use client";

import useSWR from "swr";
import { hasAll, hasAny, type PermissionKey } from "@/lib/permissions";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json());

type PermsResponse = { permissions: string[] };

export function usePermissions() {
  const swr = useSWR<PermsResponse>("/api/me/permissions", fetcher, {
    revalidateOnFocus: false,
  });
  return {
    list: swr.data?.permissions ?? [],
    isLoading: swr.isLoading,
    error: swr.error,
    mutate: swr.mutate,
  };
}

type Props = {
  all?: PermissionKey[];   // require ALL
  any?: PermissionKey[];   // or require ANY
  fallback?: React.ReactNode; // what to render if not allowed
  children: React.ReactNode;
};

export function PermissionGate({ all, any, fallback = null, children }: Props) {
  const { list } = usePermissions();

  const allowedAll = all ? hasAll(all, list) : true;
  const allowedAny = any ? hasAny(any, list) : true;

  return allowedAll && allowedAny ? <>{children}</> : <>{fallback}</>;
}
