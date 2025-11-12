"use client";

export type LoaderScenario =
  | "app:boot"
  | "navigation:start"
  | "form:initial"
  | "form:submit"
  | "form:background.field"
  | "form:background.autosave"
  | "form:background.validate"
  | "data:initial"
  | "data:refetch"
  | "auth:loading"
  | "custom";

export type LoaderVariant = "blocking" | "background";

export interface LoaderMessage {
  title: string;
  message?: string;
  variant: LoaderVariant;
}

const LOADER_MESSAGE_MAP: Record<LoaderScenario, LoaderMessage> = {
  "app:boot": {
    title: "Loading workspace…",
    message: "Preparing your environment…",
    variant: "blocking",
  },
  "navigation:start": {
    title: "Navigating…",
    message: "Loading next page…",
    variant: "blocking",
  },
  "form:initial": {
    title: "Loading form…",
    message: "Fetching existing data…",
    variant: "blocking",
  },
  "form:submit": {
    title: "Saving changes…",
    message: "Applying your updates…",
    variant: "blocking",
  },
  "form:background.field": {
    title: "Loading field options…",
    message: undefined,
    variant: "background",
  },
  "form:background.autosave": {
    title: "Saving draft…",
    message: undefined,
    variant: "background",
  },
  "form:background.validate": {
    title: "Validating…",
    message: undefined,
    variant: "background",
  },
  "data:initial": {
    title: "Loading data…",
    message: "Fetching latest records…",
    variant: "blocking",
  },
  "data:refetch": {
    title: "Refreshing data…",
    message: undefined,
    variant: "background",
  },
  "auth:loading": {
    title: "Authorizing…",
    message: "Confirming your session…",
    variant: "blocking",
  },
  custom: {
    title: "Loading…",
    message: "Please wait…",
    variant: "blocking",
  },
};

export function resolveLoaderMessage(
  scenario: LoaderScenario,
  overrides: Partial<LoaderMessage> = {},
): LoaderMessage {
  const base = LOADER_MESSAGE_MAP[scenario] ?? LOADER_MESSAGE_MAP.custom;
  return {
    title: overrides.title ?? base.title,
    message: overrides.message ?? base.message,
    variant: overrides.variant ?? base.variant,
  };
}

export const LOADER_SCENARIOS = Object.keys(LOADER_MESSAGE_MAP) as LoaderScenario[];
