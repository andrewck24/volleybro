import { ApiClientError } from "@/lib/api/api-client";
import { ERROR_MESSAGES, type ErrorMessage } from "@/lib/api/error-messages";
import { RefreshTimeoutError } from "@/hooks/use-pull-to-refresh";

type ToastFn = (opts: {
  title: string;
  description: string;
  variant: "default" | "destructive";
}) => void;

// Total: every input resolves to an entry, so no caller branches.
export function resolveErrorDisplay(error: unknown): ErrorMessage {
  if (error instanceof RefreshTimeoutError)
    return ERROR_MESSAGES.NETWORK_TIMEOUT;
  if (!(error instanceof ApiClientError)) return ERROR_MESSAGES.UNKNOWN;
  if (error.status === 401) return ERROR_MESSAGES.SESSION_EXPIRED;
  if (error.reason === "TIMEOUT" || error.reason === "NETWORK_ERROR")
    return ERROR_MESSAGES.NETWORK_TIMEOUT;
  if (error.status >= 500 || error.code === "UNEXPECTED")
    return ERROR_MESSAGES.SERVER_ERROR;
  const byReason: Record<string, ErrorMessage | undefined> = ERROR_MESSAGES;
  return byReason[error.reason] ?? ERROR_MESSAGES.UNKNOWN;
}

export function handle401Redirect(
  router: { push: (href: string) => void },
  toast: ToastFn,
): void {
  toast({ ...ERROR_MESSAGES.SESSION_EXPIRED, variant: "destructive" });
  router.push("/auth/sign-in");
}

export function showErrorToast(error: unknown, toast: ToastFn): void {
  toast({ ...resolveErrorDisplay(error), variant: "destructive" });
}
