// src/components/data-table/use-container-resize.ts
import { useEffect, useRef, useState, type RefObject, type MutableRefObject } from "react";

/**
 * Hook to track container width using ResizeObserver with throttling.
 * Updates are throttled using requestAnimationFrame for performance.
 */
export function useContainerResize(
  containerRef: RefObject<HTMLElement | null> | MutableRefObject<HTMLElement | null>,
  enabled: boolean = true
): number | null {
  const [width, setWidth] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) {
      setWidth(null);
      return;
    }

    const element = containerRef.current;

    const updateWidth = () => {
      const newWidth = element.getBoundingClientRect().width;
      setWidth(newWidth);
    };

    // Initial measurement
    updateWidth();

    // Throttle ResizeObserver updates using requestAnimationFrame
    const resizeObserver = new ResizeObserver(() => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        updateWidth();
        rafRef.current = null;
      });
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled, containerRef]);

  return width;
}

