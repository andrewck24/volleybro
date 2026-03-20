import { ApiClientError } from "@/lib/api/api-client";

type ToastFn = (opts: {
  title: string;
  description: string;
  variant: "default" | "destructive";
}) => void;

/**
 * Determines if the error is a server/unexpected error that deserves
 * branded volleyball-themed messaging (not user-actionable).
 */
function isServerError(error: ApiClientError): boolean {
  return error.status >= 500 || error.code === "UNEXPECTED";
}

/**
 * Show an error toast appropriate for mutation failures
 * (form submissions, match recording, etc.)
 *
 * - Server / unexpected errors → branded volleyball-themed empathetic message with retry guidance (zh-TW)
 * - Operational errors (4xx) → user-actionable message from error.detail
 * - Unknown errors → generic fallback
 */
export function showErrorToast(error: unknown, toast: ToastFn): void {
  if (error instanceof ApiClientError) {
    if (isServerError(error)) {
      toast({
        title: "哎呀，發球掛網了！",
        description: "伺服器暫時無法處理你的請求，請稍後再試一次。",
        variant: "destructive",
      });
      return;
    }

    // Operational error — user-actionable, show the detail directly
    toast({
      title: "操作失敗",
      description: error.detail,
      variant: "destructive",
    });
    return;
  }

  // Unknown / non-ApiClientError fallback
  toast({
    title: "發生未預期的錯誤",
    description: "請重新整理頁面後再試一次，若問題持續請聯繫我們。",
    variant: "destructive",
  });
}
