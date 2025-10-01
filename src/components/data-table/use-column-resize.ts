// src/components/data-table/useColumnResize.ts
import { MutableRefObject, useCallback, useRef, useState } from "react";

type Widths = Record<string, number>; // percentages

type Options = {
  /** clamp percentages (inclusive) */
  minPct?: number;
  maxPct?: number;
};

export function useColumnResize(initial: Widths, tableRef: MutableRefObject<HTMLElement | null>, opts: Options = {}) {
  const { minPct = 5, maxPct = 80 } = opts;

  const [widths, setWidths] = useState<Widths>(initial);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);

  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, columnId: string) => {
      if (!columnId) return;

      e.preventDefault();
      e.stopPropagation();

      const tableWidth = tableRef.current?.getBoundingClientRect().width ?? window.innerWidth;
      startXRef.current = e.clientX;
      startWidthRef.current = widths && columnId in widths ? widths[columnId] : 10;

      setIsResizing(true);
      setResizingColumnId(columnId);

      const onMove = (ev: MouseEvent) => {
        if (!columnId) return;

        const deltaX = ev.clientX - startXRef.current;
        const deltaPct = (deltaX / tableWidth) * 100;
        const next = Math.max(minPct, Math.min(maxPct, startWidthRef.current + deltaPct));

        setWidths((prev) => {
          if (!prev) return { [columnId]: next };
          return { ...prev, [columnId]: next };
        });

        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      };

      const onUp = () => {
        setIsResizing(false);
        setResizingColumnId(null);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [tableRef, widths, minPct, maxPct],
  );

  return {
    widths,
    setWidths,
    isResizing,
    resizingColumnId,
    onMouseDownResize: onMouseDown,
  };
}
