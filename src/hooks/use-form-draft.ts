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

const noop = () => () => {};

export function useFormDraft<T extends FieldValues>(
  key: string,
  options?: UseFormProps<T>,
): UseFormDraftReturn<T> {
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
    } catch {}
  }

  const form = useForm<T>({
    ...options,
    defaultValues: {
      ...(options?.defaultValues ?? {}),
      ...(draft ?? {}),
    } as DefaultValues<T>,
  });

  const watchedValues = useWatch({ control: form.control });
  const { isDirty } = form.formState;

  useEffect(() => {
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
    } catch {}
  }, [key]);

  return { form, clearDraft };
}
