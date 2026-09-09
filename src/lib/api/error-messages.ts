export type ErrorMessage = { title: string; description: string };

type ClassKey =
  "SESSION_EXPIRED" | "NETWORK_TIMEOUT" | "SERVER_ERROR" | "UNKNOWN";

type ReasonKey = "RESOURCE_NOT_FOUND" | "INVALID_INPUT";

type CatalogueKey = ClassKey | ReasonKey;

export const ERROR_MESSAGES: Record<CatalogueKey, ErrorMessage> = {
  SESSION_EXPIRED: { title: "登入逾期", description: "請重新登入" },
  NETWORK_TIMEOUT: {
    title: "連線逾時",
    description: "請稍後再試，若問題持續請確認網路連線",
  },
  SERVER_ERROR: {
    title: "哎呀，發球掛網！",
    description: "伺服器暫時無法處理你的請求，請稍後再試一次",
  },
  UNKNOWN: {
    title: "發生未預期的錯誤",
    description: "請重新整理頁面後再試一次，若問題持續請聯繫我們",
  },
  RESOURCE_NOT_FOUND: {
    title: "找不到資料",
    description: "這筆資料可能已被刪除，請重新整理後再試",
  },
  INVALID_INPUT: {
    title: "有欄位需要修正",
    description: "請確認標示的欄位後再送出",
  },
};
