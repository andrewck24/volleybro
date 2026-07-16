"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type {
  DefaultValues,
  FieldValues,
  UseFormProps,
  UseFormReturn,
} from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";

interface UseFormDraftReturn<T extends FieldValues> {
  form: UseFormReturn<T>;
  clearDraft: () => void;
}

// noop subscribe: sessionStorage has no change notifications we need to listen to;
// our own writes are tracked via the persist useEffect below.
const noop = () => () => {};

export function useFormDraft<T extends FieldValues>(
  key: string,
  options?: UseFormProps<T>,
): UseFormDraftReturn<T> {
  // useSyncExternalStore separates server (getServerSnapshot → null) from client
  // (getSnapshot → real storage value), letting React reconcile without a hydration
  // warning even when a stale draft exists in sessionStorage.
  const draftJson = useSyncExternalStore(
    noop,
    () => {
      try {
        return sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );

  let draft: Partial<DefaultValues<T>> | null = null;
  if (draftJson) {
    try {
      draft = JSON.parse(draftJson) as Partial<DefaultValues<T>>;
    } catch {
      // corrupt storage entry — treat as no draft
    }
  }

  const form = useForm<T>({
    ...options,
    // Merge draft over the caller's defaults so the baseline keeps a stable shape.
    // JSON.stringify drops `undefined` fields, so a persisted draft is always a
    // partial object; without merging, rehydrated defaults would miss those keys
    // and react-hook-form would report a false `isDirty`.
    defaultValues: {
      ...(options?.defaultValues ?? {}),
      ...(draft ?? {}),
    } as DefaultValues<T>,
  });

  const watchedValues = useWatch({ control: form.control });
  const { isDirty } = form.formState;

  useEffect(() => {
    // Only persist once the user actually edits the form. Persisting on mount
    // would write the initial snapshot, which then rehydrates as a draft on the
    // next mount (e.g. StrictMode/modal reopen) and triggers a false `isDirty`.
    if (!isDirty) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(watchedValues));
    } catch (e) {
      console.warn("[useFormDraft] Failed to persist draft:", e);
    }
  }, [key, watchedValues, isDirty]);

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // best-effort cleanup; ignore if storage is unavailable
    }
  }, [key]);

  return { form, clearDraft };
}
