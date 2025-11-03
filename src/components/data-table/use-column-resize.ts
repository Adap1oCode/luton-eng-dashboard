// src/components/data-table/useColumnResize.ts
import { MutableRefObject, useCallback, useRef, useState } from "react";

type Widths = Record<string, number>; // pixel widths

type Options = {
  /** minimum pixel width (inclusive) */
  minPx?: number;
  /** maximum pixel width (inclusive) */
  maxPx?: number;
  /** column definitions to extract minPx/maxPx from meta */
  getColumnMeta?: (columnId: string) => { minPx?: number; maxPx?: number } | null;
};

export function useColumnResize(initial: Widths, tableRef: MutableRefObject<HTMLElement | null>, opts: Options = {}) {
  const { minPx: defaultMinPx = 80, maxPx: defaultMaxPx = 800, getColumnMeta } = opts;

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

      // Get current column width in pixels from DOM or state
      const headerEl = e.currentTarget.closest('th');
      const currentWidthPx = headerEl?.getBoundingClientRect().width ?? (widths[columnId] ?? defaultMinPx);
      
      startXRef.current = e.clientX;
      startWidthRef.current = currentWidthPx;

      setIsResizing(true);
      setResizingColumnId(columnId);

      const onMove = (ev: MouseEvent) => {
        if (!columnId) return;

        const deltaX = ev.clientX - startXRef.current;
        const newWidthPx = startWidthRef.current + deltaX;

        // Get column-specific min/max from meta or use defaults
        const meta = getColumnMeta?.(columnId);
        const minPx = meta?.minPx ?? defaultMinPx;
        const maxPx = meta?.maxPx ?? defaultMaxPx;
        const clampedWidth = Math.max(minPx, Math.min(maxPx, newWidthPx));

        setWidths((prev) => {
          if (!prev) return { [columnId]: clampedWidth };
          return { ...prev, [columnId]: clampedWidth };
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
    [tableRef, widths, defaultMinPx, defaultMaxPx, getColumnMeta],
  );

  return {
    widths,
    setWidths,
    isResizing,
    resizingColumnId,
    onMouseDownResize: onMouseDown,
  };
}
