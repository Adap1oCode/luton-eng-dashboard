"use client";

import { useSyncExternalStore } from "react";

type State = {
  isDirty: boolean;
  isSubmitting: boolean;
  isComplete: boolean;
};

const DEFAULT_STATE: State = { isDirty: false, isSubmitting: false, isComplete: false };

const stateMap = new Map<string, State>();
const listenersMap = new Map<string, Set<() => void>>();

function getState(formId: string): State {
  return stateMap.get(formId) ?? DEFAULT_STATE;
}

function setState(formId: string, next: State) {
  stateMap.set(formId, next);
  const listeners = listenersMap.get(formId);
  if (!listeners) return;
  listeners.forEach((listener) => listener());
}

export function setFormDirty(formId: string, isDirty: boolean) {
  const prev = getState(formId);
  if (prev.isDirty === isDirty) return;
  setState(formId, { ...prev, isDirty });
}

export function setFormSubmitting(formId: string, isSubmitting: boolean) {
  const prev = getState(formId);
  if (prev.isSubmitting === isSubmitting) return;
  setState(formId, { ...prev, isSubmitting });
}

export function setFormComplete(formId: string, isComplete: boolean) {
  const prev = getState(formId);
  if (prev.isComplete === isComplete) return;
  setState(formId, { ...prev, isComplete });
}

export function resetFormState(formId: string) {
  setState(formId, DEFAULT_STATE);
}

export function useFormStateStore(formId: string): State {
  return useSyncExternalStore(
    (listener) => {
      const listeners = listenersMap.get(formId) ?? new Set();
      listeners.add(listener);
      listenersMap.set(formId, listeners);
      return () => {
        const existing = listenersMap.get(formId);
        if (!existing) return;
        existing.delete(listener);
        if (existing.size === 0) {
          listenersMap.delete(formId);
        }
      };
    },
    () => getState(formId),
    () => DEFAULT_STATE
  );
}

