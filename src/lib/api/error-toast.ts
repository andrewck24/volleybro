import { ApiClientError } from "@/lib/api/api-client";
import { ERROR_MESSAGES, type ErrorMessage } from "@/lib/api/error-messages";
import { RefreshTimeoutError } from "@/hooks/use-pull-to-refresh";

type ToastFn = (opts: {
  title: string;
  description: string;
  variant: "default" | "destructive";
}) => void;

/**
 * Resolve any thrown value into the message the user reads. Total — every
 * input, including a non-ApiClientError, resolves to a catalogue entry.
 */
export function resolveErrorDisplay(error: unknown): ErrorMessage {
  if (error instanceof RefreshTimeoutError)
    return ERROR_MESSAGES.NETWORK_TIMEOUT;
  if (!(error instanceof ApiClientError)) return ERROR_MESSAGES.UNKNOWN;
  if (error.status === 401) return ERROR_MESSAGES.SESSION_EXPIRED;
  if (error.reason === "TIMEOUT" || error.reason === "NETWORK_ERROR")
    return ERROR_MESSAGES.NETWORK_TIMEOUT;
  if (error.status >= 500 || error.code === "UNEXPECTED")
    return ERROR_MESSAGES.SERVER_ERROR;
  const catalogue: Partial<Record<string, ErrorMessage>> = ERROR_MESSAGES;
  return catalogue[error.reason] ?? ERROR_MESSAGES.UNKNOWN;
}

export function handle401Redirect(
  router: { push: (href: string) => void },
  toast: ToastFn,
): void {
  toast({ ...ERROR_MESSAGES.SESSION_EXPIRED, variant: "destructive" });
  router.push("/auth/sign-in");
}

/**
 * Show an error toast appropriate for mutation failures
 * (form submissions, game recording, etc.)
 */
export function showErrorToast(error: unknown, toast: ToastFn): void {
  toast({ ...resolveErrorDisplay(error), variant: "destructive" });
}
