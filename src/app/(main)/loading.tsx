import { APP_CONFIG } from "@/config/app-config";

export default function Loading() {
  return (
    <div className="bg-background/70 fixed inset-0 z-[1000] flex items-center justify-center backdrop-blur-sm">
      <div className="animate-in fade-in flex flex-col items-center gap-5 duration-200">
        <div className="relative">
          <div className="border-primary/30 size-12 rounded-full border-2" />
          <div className="border-primary absolute inset-0 animate-spin rounded-full border-t-2" />
        </div>
        <div className="text-center">
          <div className="text-muted-foreground text-sm font-medium">Navigating…</div>
          <div className="text-foreground text-base font-semibold">{APP_CONFIG.meta.title || APP_CONFIG.name}</div>
        </div>
      </div>
    </div>
  );
}
