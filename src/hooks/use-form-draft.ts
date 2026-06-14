"use client";

import { useCallback, useEffect } from "react";
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

export function useFormDraft<T extends FieldValues>(
  key: string,
  options?: UseFormProps<T>,
): UseFormDraftReturn<T> {
  let draft: Partial<DefaultValues<T>> | null = null;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) draft = JSON.parse(raw) as Partial<DefaultValues<T>>;
  } catch {
    // sessionStorage inaccessible or corrupt — fall back to caller-supplied defaultValues
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
