"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SWRConfig } from "swr";
import { handle401Redirect, showErrorToast } from "@/lib/api/error-toast";
import { useToast } from "@/components/ui/use-toast";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const handleUnauthorized = () => handle401Redirect(router, toast);
    window.addEventListener("api:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("api:unauthorized", handleUnauthorized);
  }, [router, toast]);

  return (
    <SWRConfig value={{ onError: (error) => showErrorToast(error, toast) }}>
      {children}
    </SWRConfig>
  );
}
