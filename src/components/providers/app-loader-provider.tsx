"use client";

import * as React from "react";

import {
  resolveLoaderMessage,
  type LoaderMessage,
  type LoaderScenario,
  type LoaderVariant,
} from "@/components/providers/loader-messages";

type LoaderPayload = Partial<LoaderMessage>;

interface LoaderQueueItem {
  id: string;
  payload: LoaderMessage;
  scenario?: LoaderScenario;
  startedAt: number;
}

interface LoaderState {
  isVisible: boolean;
  title: string;
  message?: string;
  variant: LoaderVariant;
}

export interface LoaderOptions {
  payload?: LoaderPayload;
  scenario?: LoaderScenario;
}

interface AppLoaderContextValue {
  state: LoaderState;
  begin: (payload?: LoaderPayload, scenario?: LoaderScenario) => string;
  update: (id: string, payload: LoaderPayload) => void;
  end: (id: string) => void;
  withLoader: <T>(task: () => Promise<T>, options?: LoaderOptions) => Promise<T>;
  clearAll: () => void;
}

export interface LoaderMetricsEvent {
  id: string;
  scenario?: LoaderScenario;
  title: string;
  message?: string;
  variant: LoaderVariant;
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

export type LoaderMetricsReporter = (event: LoaderMetricsEvent) => void;

const DEFAULT_TITLE = "Loading…";
const DEFAULT_MESSAGE = "Please wait…";

const DEFAULT_STATE: LoaderState = {
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

function mergePayload(base: LoaderMessage, patch: LoaderPayload, scenario?: LoaderScenario): LoaderMessage {
  const merged: LoaderPayload = {
    ...base,
    ...patch,
  };

  if (scenario) {
    return resolveLoaderMessage(scenario, merged);
  }

  return {
    title: merged.title ?? DEFAULT_TITLE,
    message: merged.message ?? DEFAULT_MESSAGE,
    variant: merged.variant ?? base.variant ?? "blocking",
  };
}

function defaultMetricsReporter(event: LoaderMetricsEvent) {
  if (process.env.NODE_ENV !== "production") {
    console.debug(
      `[loader] ${event.scenario ?? "custom"} completed in ${Math.round(event.durationMs)}ms`,
      event,
    );
  }
}

export interface AppLoaderProviderProps {
  children: React.ReactNode;
  bootLoaderDelayMs?: number;
  bootMessage?: string;
  onMetrics?: LoaderMetricsReporter;
}

export function AppLoaderProvider({
  children,
  bootLoaderDelayMs = 600,
  bootMessage = "Preparing your workspace...",
  onMetrics,
}: AppLoaderProviderProps) {
  const queueRef = React.useRef<LoaderQueueItem[]>([]);
  const bootTimerRef = React.useRef<number>();
  const metricsReporterRef = React.useRef<LoaderMetricsReporter>(onMetrics ?? defaultMetricsReporter);
  const [state, setState] = React.useState<LoaderState>(DEFAULT_STATE);

  React.useEffect(() => {
    metricsReporterRef.current = onMetrics ?? defaultMetricsReporter;
  }, [onMetrics]);

  const refreshState = React.useCallback(() => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) {
      setState(DEFAULT_STATE);
      return;
    }
    const active = currentQueue[currentQueue.length - 1];
    setState({
      isVisible: true,
      title: active.payload.title,
      message: active.payload.message,
      variant: active.payload.variant,
    });
  }, []);

  const begin = React.useCallback(
    (payload: LoaderPayload = {}, scenario?: LoaderScenario) => {
      const resolved = scenario
        ? resolveLoaderMessage(scenario, payload)
        : {
            title: payload.title ?? DEFAULT_TITLE,
            message: payload.message ?? DEFAULT_MESSAGE,
            variant: payload.variant ?? "blocking",
          };

      const id = generateId();
      queueRef.current = [
        ...queueRef.current,
        { id, payload: resolved, scenario, startedAt: Date.now() },
      ];
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
          ...item,
          payload: mergePayload(item.payload, payload, item.scenario),
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
      const currentQueue = queueRef.current;
      const match = currentQueue.find((item) => item.id === id);
      const nextQueue = currentQueue.filter((item) => item.id !== id);
      if (nextQueue.length === currentQueue.length) {
        return;
      }
      queueRef.current = nextQueue;
      refreshState();

      if (match) {
        const endedAt = Date.now();
        metricsReporterRef.current({
          id,
          scenario: match.scenario,
          title: match.payload.title,
          message: match.payload.message,
          variant: match.payload.variant,
          startedAt: match.startedAt,
          endedAt,
          durationMs: endedAt - match.startedAt,
        });
      }
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
    async <T,>(task: () => Promise<T>, options: LoaderOptions = {}) => {
      const id = begin(options.payload, options.scenario);
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
      bootLoaderId = begin(
        { message: bootMessage },
        "app:boot",
      );
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
    (payload?: LoaderPayload, scenario: LoaderScenario = "navigation:start") =>
      begin(payload, scenario),
    [begin],
  );
  const hide = React.useCallback((id: string) => end(id), [end]);
  const patch = React.useCallback(
    (id: string, payload: LoaderPayload) => update(id, payload),
    [update],
  );
  const run = React.useCallback(
    <T,>(task: () => Promise<T>, payload?: LoaderPayload, scenario: LoaderScenario = "navigation:start") =>
      withLoader(task, { payload, scenario }),
    [withLoader],
  );

  return { show, hide, patch, run };
}

export function useBackgroundLoader() {
  const { begin, end, update, withLoader } = useAppLoader();

  const show = React.useCallback(
    (payload?: LoaderPayload, scenario: LoaderScenario = "data:refetch") =>
      begin(payload, scenario),
    [begin],
  );
  const hide = React.useCallback((id: string) => end(id), [end]);
  const patch = React.useCallback(
    (id: string, payload: LoaderPayload) => update(id, payload),
    [update],
  );
  const run = React.useCallback(
    <T,>(task: () => Promise<T>, payload?: LoaderPayload, scenario: LoaderScenario = "data:refetch") =>
      withLoader(task, { payload, scenario }),
    [withLoader],
  );

  return { show, hide, patch, run };
}

export function useLoaderNavigation(defaultPayload?: LoaderPayload) {
  const { show, hide } = useRouteLoader();
  const pendingIdRef = React.useRef<string | null>(null);

  const startNavigation = React.useCallback(
    (payload?: LoaderPayload, scenario: LoaderScenario = "navigation:start") => {
      if (pendingIdRef.current) {
        hide(pendingIdRef.current);
      }
      pendingIdRef.current = show({ ...defaultPayload, ...payload }, scenario);
      return pendingIdRef.current;
    },
    [defaultPayload, hide, show],
  );

  const endNavigation = React.useCallback(() => {
    if (pendingIdRef.current) {
      hide(pendingIdRef.current);
      pendingIdRef.current = null;
    }
  }, [hide]);

  React.useEffect(
    () => () => {
      if (pendingIdRef.current) {
        hide(pendingIdRef.current);
        pendingIdRef.current = null;
      }
    },
    [hide],
  );

  return { startNavigation, endNavigation };
}
