import { resolveLoaderMessage } from "@/components/providers/loader-messages";

const copy = resolveLoaderMessage("auth:loading");

export default function AuthLoading() {
  return (
    <div className="bg-background/70 flex min-h-screen items-center justify-center backdrop-blur-sm">
      <div className="animate-in fade-in flex flex-col items-center gap-4 rounded-lg bg-card/95 px-8 py-6 shadow-lg duration-200">
        <div className="relative">
          <div className="border-primary/30 size-12 rounded-full border-2" />
          <div className="border-primary absolute inset-0 animate-spin rounded-full border-t-2" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">{copy.title}</h2>
          {copy.message ? (
            <p className="text-sm font-medium text-muted-foreground">{copy.message}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
