"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { SWRConfig } from "swr";
import { API_UNAUTHORIZED_EVENT } from "@/lib/api/api-client";
import { handle401Redirect, showErrorToast } from "@/lib/api/error-toast";
import { useToast } from "@/components/ui/use-toast";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();

  // Refs keep the handler closure fresh without re-registering the listener.
  const routerRef = useRef(router);
  const toastRef = useRef(toast);
  useEffect(() => {
    routerRef.current = router;
    toastRef.current = toast;
  }, [router, toast]);

  useEffect(() => {
    // `redirecting` is never reset and this effect's deps are [] while
    // SWRProvider lives in the root layout, so it survives every
    // client-side navigation. Safe only because sign-in is Google OAuth
    // exclusively (src/components/auth/sign-in/form.tsx) — a full page
    // load that re-initialises it. An email/password or in-page session
    // refresh would need this flag reset on success.
    let redirecting = false;
    const handleUnauthorized = () => {
      if (redirecting) return;
      redirecting = true;
      handle401Redirect(routerRef.current, toastRef.current);
    };
    window.addEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const onError = useCallback(
    (error: unknown) => showErrorToast(error, toastRef.current),
    [],
  );

  return <SWRConfig value={{ onError }}>{children}</SWRConfig>;
}
