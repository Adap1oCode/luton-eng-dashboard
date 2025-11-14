"use client";

import * as React from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type UserLite = {
  id: string;
  full_name: string | null;
  email: string | null;
  role_name?: string | null;
  avatar_url?: string | null;
};

// Helper to get initials from name
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

// Helper to generate consistent color from string
function getAvatarColor(str: string): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function SwitchUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [users, setUsers] = React.useState<UserLite[]>([]);
  const [filter, setFilter] = React.useState("");
  const [selected, setSelected] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/users", { cache: "no-store" });
        if (!res.ok) {
          console.error("Failed to fetch users:", res.status, res.statusText);
          if (active) setUsers([]);
          return;
        }
        const data = await res.json();
        // Ensure data is an array (API might return error object)
        if (active) {
          setUsers(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
        if (active) setUsers([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  const filtered = users.filter((u) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return (u.full_name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
  });

  const apply = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch("/api/impersonate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: selected }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("Failed to switch user:", res.status, errorData);
        // Show error to user (you might want to use a toast/notification here)
        const errorMessage = errorData.message || errorData.error || res.statusText || "Unknown error";
        alert(`Failed to switch user: ${errorMessage}`);
        return;
      }
      
      // Success - close dialog and refresh
      onOpenChange(false);
      // Force a full page reload to ensure all context is refreshed
      window.location.reload();
    } catch (error) {
      console.error("Error switching user:", error);
      alert(`Error switching user: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full border-gray-200 bg-white sm:max-w-md dark:border-gray-800 dark:bg-[hsl(268_34%_6%)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-normal">Switch User</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Search name or email…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50"
        />

        <ScrollArea className="-mx-6 max-h-[400px]">
          <div className="px-2">
            {filtered.map((u) => {
              const displayName = u.full_name ?? u.email ?? u.id;
              const account = u.email ?? "";
              const initials = u.full_name ? getInitials(u.full_name) : (u.email?.[0]?.toUpperCase() ?? "U");
              const avatarColor = getAvatarColor(u.id);

              return (
                <button
                  key={u.id}
                  onClick={() => setSelected(u.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/50 ${
                    selected === u.id ? "bg-gray-100 dark:bg-gray-800/50" : ""
                  }`}
                >
                  <div className="flex-shrink-0">
                    {u.avatar_url ? (
                      <Image
                        src={u.avatar_url}
                        alt={displayName}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full font-medium text-white ${avatarColor}`}
                      >
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate font-medium text-gray-900 dark:text-gray-100">{displayName}</div>
                    {account && <div className="truncate text-sm text-gray-600 dark:text-gray-400">{account}</div>}
                  </div>
                </button>
              );
            })}
            {!filtered.length && (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No matches found</div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={cancel} variant="outline" disabled={loading}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={!selected || loading} variant="default">
            Switch User
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
