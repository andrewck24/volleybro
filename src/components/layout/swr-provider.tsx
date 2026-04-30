"use client";

import { useRouter } from "next/navigation";
import { SWRConfig } from "swr";
import { ApiClientError } from "@/lib/api/api-client";
import { handle401Redirect, showErrorToast } from "@/lib/api/error-toast";
import { useToast } from "@/components/ui/use-toast";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();

  const onError = (error: unknown) => {
    if (error instanceof ApiClientError && error.status === 401) {
      handle401Redirect(router, toast);
    } else {
      showErrorToast(error, toast);
    }
  };

  return <SWRConfig value={{ onError }}>{children}</SWRConfig>;
}
