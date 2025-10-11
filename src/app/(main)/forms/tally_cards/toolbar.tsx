"use client";

import { useRouter } from "next/navigation";
import ActionToolbar from "@/components/forms/shell/action-toolbar";

type Props = {
  selectedIds?: string[];   // provided by the page or table client
};

export default function TallyCardsToolbar({ selectedIds = [] }: Props) {
  const router = useRouter();
  const hasOne = selectedIds.length === 1;
  const hasAny = selectedIds.length > 0;

  return (
    <ActionToolbar
      onNew={() => router.push("/forms/tally_cards/new")}
      onDuplicate={() => {
        if (!hasOne) return;
        router.push(`/forms/tally_cards/${selectedIds[0]}/duplicate`);
      }}
      onDelete={async () => {
        if (!hasAny) return;
        await fetch("/api/tally_cards/bulk-delete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids: selectedIds }),
        });
        router.refresh();
      }}
      onPrintReport={() => window.open("/forms/tally_cards/print/report", "_blank")}
      onPrintInvoice={() => window.open("/forms/tally_cards/print/invoice", "_blank")}
      onPrintPackingSlip={() => window.open("/forms/tally_cards/print/packing-slip", "_blank")}
      disabledDelete={!hasAny}
      disabledDuplicate={!hasOne}
    />
  );
}
