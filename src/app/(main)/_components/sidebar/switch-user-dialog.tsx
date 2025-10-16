"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type UserLite = { id: string; full_name: string | null; email: string | null };

export function SwitchUserDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
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
        if (!res.ok) return;
        const data = (await res.json()) as UserLite[];
        if (active) setUsers(data);
      } catch {}
    })();
    return () => { active = false; };
  }, [open]);

  const filtered = users.filter(u => {
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
      if (res.ok) {
        onOpenChange(false);
        router.refresh(); // reload SSR with effective context
      }
    } finally { setLoading(false); }
  };

  const clear = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/impersonate", { method: "DELETE" });
      if (res.ok) {
        onOpenChange(false);
        router.refresh();
      }
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>View as user</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Search name or email…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <ScrollArea className="max-h-64 rounded border">
          <ul className="divide-y">
            {filtered.map(u => (
              <li key={u.id}>
                <label className="flex items-center gap-3 p-2 cursor-pointer">
                  <input
                    type="radio"
                    name="impersonate"
                    value={u.id}
                    checked={selected === u.id}
                    onChange={() => setSelected(u.id)}
                  />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.full_name ?? u.email ?? u.id}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                </label>
              </li>
            ))}
            {!filtered.length && <li className="p-3 text-sm text-muted-foreground">No matches</li>}
          </ul>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button onClick={clear} variant="secondary" disabled={loading}>Revert</Button>
          <Button onClick={apply} disabled={!selected || loading}>View as</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
