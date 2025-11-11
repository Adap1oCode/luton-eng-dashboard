"use client";

import * as React from "react";

type LoaderVariant = "blocking" | "background";

export interface LoaderPayload {
  title?: string;
  message?: string;
  variant?: LoaderVariant;
}

interface LoaderQueueItem {
  id: string;
  payload: LoaderPayload;
}

interface LoaderState {
  isVisible: boolean;
  title: string;
  message?: string;
  variant: LoaderVariant;
}

interface AppLoaderContextValue {
  state: LoaderState;
  begin: (payload?: LoaderPayload) => string;
  update: (id: string, payload: LoaderPayload) => void;
  end: (id: string) => void;
  withLoader: <T>(task: () => Promise<T>, payload?: LoaderPayload) => Promise<T>;
  clearAll: () => void;
}

const DEFAULT_TITLE = "Loading...";
const DEFAULT_MESSAGE = "Please wait...";

const HIDDEN_STATE: LoaderState = {
  isVisible: false,
  title: DEFAULT_TITLE,
  message: DEFAULT_MESSAGE,
  variant: "blocking",
};

const AppLoaderContext = React.createContext<AppLoaderContextValue | undefined>(undefined);

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function mergePayload(base: LoaderPayload, patch: LoaderPayload): LoaderPayload {
  return {
    ...base,
    ...patch,
  };
}

export interface AppLoaderProviderProps {
  children: React.ReactNode;
  /**
   * Delay (ms) after window load before the initial app loader is dismissed.
   * Mirrors the previous InitialLoadGate behaviour.
   */
  bootLoaderDelayMs?: number;
  /**
   * Optional override message shown during the very first boot.
   */
  bootMessage?: string;
}

export function AppLoaderProvider({
  children,
  bootLoaderDelayMs = 600,
  bootMessage = "Preparing your workspace...",
}: AppLoaderProviderProps) {
  const queueRef = React.useRef<LoaderQueueItem[]>([]);
  const bootTimerRef = React.useRef<number>();
  const [state, setState] = React.useState<LoaderState>(HIDDEN_STATE);

  const refreshState = React.useCallback(() => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) {
      setState(HIDDEN_STATE);
      return;
    }
    const active = currentQueue[currentQueue.length - 1];
    setState({
      isVisible: true,
      title: active.payload.title ?? DEFAULT_TITLE,
      message: active.payload.message ?? DEFAULT_MESSAGE,
      variant: active.payload.variant ?? "blocking",
    });
  }, []);

  const begin = React.useCallback(
    (payload: LoaderPayload = {}) => {
      const id = generateId();
      queueRef.current = [...queueRef.current, { id, payload }];
      refreshState();
      return id;
    },
    [refreshState],
  );

  const update = React.useCallback(
    (id: string, payload: LoaderPayload) => {
      let changed = false;
      queueRef.current = queueRef.current.map((item) => {
        if (item.id !== id) {
          return item;
        }
        changed = true;
        return {
          id,
          payload: mergePayload(item.payload, payload),
        };
      });
      if (changed) {
        refreshState();
      }
    },
    [refreshState],
  );

  const end = React.useCallback(
    (id: string) => {
      const nextQueue = queueRef.current.filter((item) => item.id !== id);
      if (nextQueue.length === queueRef.current.length) {
        return;
      }
      queueRef.current = nextQueue;
      refreshState();
    },
    [refreshState],
  );

  const clearAll = React.useCallback(() => {
    if (queueRef.current.length === 0) {
      return;
    }
    queueRef.current = [];
    refreshState();
  }, [refreshState]);

  const withLoader = React.useCallback(
    async <T,>(task: () => Promise<T>, payload?: LoaderPayload) => {
      const id = begin(payload);
      try {
        return await task();
      } finally {
        end(id);
      }
    },
    [begin, end],
  );

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let bootLoaderId: string | null = null;

    const alreadyBooted = sessionStorage.getItem("__app_loader_bootstrap__");
    if (!alreadyBooted) {
      bootLoaderId = begin({
        title: DEFAULT_TITLE,
        message: bootMessage || DEFAULT_MESSAGE,
        variant: "blocking",
      });
    }

    const clearBootLoader = () => {
      if (bootLoaderId) {
        end(bootLoaderId);
        bootLoaderId = null;
      }
      sessionStorage.setItem("__app_loader_bootstrap__", "1");
    };

    const scheduleClear = () => {
      if (!bootLoaderId) {
        return;
      }
      bootTimerRef.current = window.setTimeout(clearBootLoader, bootLoaderDelayMs);
    };

    if (!alreadyBooted) {
      if (document.readyState === "complete") {
        scheduleClear();
      } else {
        const handleLoad = () => {
          scheduleClear();
        };
        window.addEventListener("load", handleLoad, { once: true });
        return () => {
          window.removeEventListener("load", handleLoad);
          if (bootTimerRef.current) {
            window.clearTimeout(bootTimerRef.current);
          }
          if (bootLoaderId) {
            end(bootLoaderId);
          }
        };
      }
    }

    return () => {
      if (bootTimerRef.current) {
        window.clearTimeout(bootTimerRef.current);
      }
      if (bootLoaderId) {
        end(bootLoaderId);
      }
    };
  }, [begin, end, bootLoaderDelayMs, bootMessage]);

  const contextValue = React.useMemo<AppLoaderContextValue>(
    () => ({
      state,
      begin,
      update,
      end,
      withLoader,
      clearAll,
    }),
    [state, begin, update, end, withLoader, clearAll],
  );

  return <AppLoaderContext.Provider value={contextValue}>{children}</AppLoaderContext.Provider>;
}

export function useAppLoader() {
  const context = React.useContext(AppLoaderContext);
  if (!context) {
    throw new Error("useAppLoader must be used within an AppLoaderProvider");
  }
  return context;
}

export function useRouteLoader() {
  const { begin, end, update, withLoader } = useAppLoader();

  const show = React.useCallback(
    (payload?: LoaderPayload) => begin({ variant: "blocking", ...payload }),
    [begin],
  );
  const hide = React.useCallback((id: string) => end(id), [end]);
  const patch = React.useCallback(
    (id: string, payload: LoaderPayload) => update(id, payload),
    [update],
  );
  const run = React.useCallback(
    <T,>(task: () => Promise<T>, payload?: LoaderPayload) =>
      withLoader(task, { variant: "blocking", ...payload }),
    [withLoader],
  );

  return { show, hide, patch, run };
}

export function useBackgroundLoader() {
  const { begin, end, update, withLoader } = useAppLoader();

  const show = React.useCallback(
    (payload?: LoaderPayload) => begin({ variant: "background", ...payload }),
    [begin],
  );
  const hide = React.useCallback((id: string) => end(id), [end]);
  const patch = React.useCallback(
    (id: string, payload: LoaderPayload) => update(id, payload),
    [update],
  );
  const run = React.useCallback(
    <T,>(task: () => Promise<T>, payload?: LoaderPayload) =>
      withLoader(task, { variant: "background", ...payload }),
    [withLoader],
  );

  return { show, hide, patch, run };
}
