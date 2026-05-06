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
  let draft: DefaultValues<T> | null = null;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) draft = JSON.parse(raw) as DefaultValues<T>;
  } catch {
    // sessionStorage inaccessible or corrupt — fall back to caller-supplied defaultValues
  }

  const form = useForm<T>({
    ...options,
    defaultValues: draft ?? options?.defaultValues,
  });

  const watchedValues = useWatch({ control: form.control });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(watchedValues));
    } catch (e) {
      console.warn("[useFormDraft] Failed to persist draft:", e);
    }
  }, [key, watchedValues]);

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // best-effort cleanup; ignore if storage is unavailable
    }
  }, [key]);

  return { form, clearDraft };
}
