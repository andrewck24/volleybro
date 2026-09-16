import {
  AuthReason,
  CommonReason,
  GameReason,
  PlayerReason,
  ProfileReason,
} from "@/entities/errors";

export type ErrorMessage = { title: string; description: string };

type ClassKey =
  "SESSION_EXPIRED" | "NETWORK_TIMEOUT" | "SERVER_ERROR" | "UNKNOWN";

type AbsorbedReason = (typeof ABSORBED_REASONS)[number];
// Derived, so renaming a reason is a compile error rather than a silent miss.
type ReasonKey = Exclude<
  AuthReason | CommonReason | GameReason | PlayerReason | ProfileReason,
  AbsorbedReason
>;

type CatalogueKey = ClassKey | ReasonKey;

// 401 reasons resolved to SESSION_EXPIRED and the 5xx reason resolved to
// SERVER_ERROR before the reason lookup ever runs — no catalogue entry needed.
export const ABSORBED_REASONS = [
  AuthReason.SESSION_REQUIRED,
  AuthReason.INVALID_SESSION,
  AuthReason.USER_NOT_FOUND,
  CommonReason.UNHANDLED_ERROR,
] as const;

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
  OWNER_CANNOT_LEAVE: {
    title: "隊長無法離開隊伍",
    description: "請先把隊長轉移給其他成員，再離開",
  },
  NOT_PLAYER_OWNER: {
    title: "無法代替他人離開",
    description: "你只能讓自己離開隊伍",
  },
  NOT_TEAM_OWNER: {
    title: "只有隊長可以轉移",
    description: "轉移隊長身分需要目前的隊長操作",
  },
  TARGET_NOT_IN_TEAM: {
    title: "對方不在這支隊伍",
    description: "只能把隊長轉移給隊上的成員",
  },
  TARGET_NOT_MEMBER: {
    title: "對方尚未加入",
    description: "邀請中的成員要先接受邀請，才能成為隊長",
  },
  TARGET_IS_OWNER: {
    title: "擁有者無法被變更或刪除",
    description: "擁有權只能由擁有者本人移轉給其他成員",
  },
  TARGET_IS_SELF: {
    title: "無法對自己的球員操作",
    description: "要離開這支隊伍，請使用離開隊伍",
  },
  TARGET_NOT_LINKED: {
    title: "這位球員沒有帳號",
    description: "先邀請對方加入，才能設定角色",
  },
  PLAYER_NOT_FOUND: {
    title: "找不到這位成員",
    description: "對方可能已離開隊伍，請重新整理後再試",
  },
  INSUFFICIENT_ROLE: {
    title: "權限不足",
    description: "你的身份無法執行這項操作",
  },
  NOT_TEAM_MEMBER: {
    title: "沒有這支隊伍的權限",
    description: "你不是這支隊伍的成員",
  },
  NOT_RECIPIENT: {
    title: "這封邀請不是給你的",
    description: "只有收到邀請的人可以回覆",
  },
  ALREADY_INVITED: {
    title: "已經邀請過了",
    description: "對方還沒回覆這封邀請",
  },
  ALREADY_MEMBER: {
    title: "對方已經在隊上",
    description: "不需要重複邀請",
  },
  ALREADY_ON_ROSTER: {
    title: "對方已在名單上",
    description: "這個 email 的擁有者已經是隊上的球員或受邀者",
  },
  AMBIGUOUS_EMAIL: {
    title: "這個 email 對應到多個帳號",
    description: "無法確定要邀請哪一位，請改用對方帳號的 email 再試一次",
  },
  EMAIL_ALREADY_INVITED: {
    title: "這個 email 已被邀請",
    description: "你已在其他隊員邀請此 email",
  },
  NOT_INVITED: {
    title: "這封邀請已失效",
    description: "它可能已被取消，或已經處理過了",
  },
  DUPLICATE_RESOURCE: {
    title: "資料重複",
    description: "這筆資料已經存在",
  },
  GAME_NOT_FOUND: {
    title: "找不到這場比賽",
    description: "它可能已被刪除，請回到比賽列表確認",
  },
  STALE_LINEUP: {
    title: "名單已變動",
    description: "這位球員已不在出賽名單中，請重新整理後再試",
  },
  SET_NOT_FOUND: {
    title: "找不到這一局",
    description: "比賽資料可能已變動，請重新整理後再試",
  },
  INVALID_EMAIL: {
    title: "email 格式不正確",
    description: "請確認拼字後再試一次",
  },
  PROFILE_NOT_FOUND: {
    title: "找不到個人資料",
    description: "請重新登入後再試",
  },
};
