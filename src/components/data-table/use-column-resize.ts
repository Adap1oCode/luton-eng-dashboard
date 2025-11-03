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

  // Store columnId in ref to avoid closure issues
  const resizingColumnIdRef = useRef<string | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, columnId: string) => {
      if (!columnId) return;

      // Stop all event propagation IMMEDIATELY before DnD can capture
      e.preventDefault();
      e.stopPropagation();
      if (e.nativeEvent) {
        e.nativeEvent.stopImmediatePropagation();
      }

      // Get current column width in pixels from DOM or state
      const headerEl = e.currentTarget.closest('th');
      const currentWidthPx = headerEl?.getBoundingClientRect().width ?? (widths[columnId] ?? defaultMinPx);
      
      startXRef.current = e.clientX;
      startWidthRef.current = currentWidthPx;
      resizingColumnIdRef.current = columnId;

      setIsResizing(true);
      setResizingColumnId(columnId);

      const onMove = (ev: MouseEvent) => {
        const colId = resizingColumnIdRef.current;
        if (!colId) {
          // Cleanup if columnId is lost
          document.removeEventListener("mousemove", onMove, true);
          document.removeEventListener("mouseup", onUp, true);
          return;
        }

        ev.preventDefault();

        const deltaX = ev.clientX - startXRef.current;
        const newWidthPx = startWidthRef.current + deltaX;

        // Get column-specific min/max from meta or use defaults
        const meta = getColumnMeta?.(colId);
        const minPx = meta?.minPx ?? defaultMinPx;
        const maxPx = meta?.maxPx ?? defaultMaxPx;
        const clampedWidth = Math.max(minPx, Math.min(maxPx, newWidthPx));

        setWidths((prev) => {
          if (!prev) return { [colId]: clampedWidth };
          return { ...prev, [colId]: clampedWidth };
        });

        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      };

      const onUp = (ev?: MouseEvent) => {
        ev?.preventDefault();
        setIsResizing(false);
        setResizingColumnId(null);
        resizingColumnIdRef.current = null;
        document.removeEventListener("mousemove", onMove, true);
        document.removeEventListener("mouseup", onUp, true);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      // Use capture phase to ensure we get events BEFORE DnD handlers
      document.addEventListener("mousemove", onMove, { capture: true, passive: false });
      document.addEventListener("mouseup", onUp, { capture: true, passive: false });
    },
    [defaultMinPx, defaultMaxPx, getColumnMeta, widths],
  );

  return {
    widths,
    setWidths,
    isResizing,
    resizingColumnId,
    onMouseDownResize: onMouseDown,
  };
}
