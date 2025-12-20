export type Profile = {
  _id: string; // 未來遷移 PostgreSQL 時改為 id
  userId: string; // 關聯 Better Auth user.id
  teams: {
    joined: string[];
    inviting: string[];
  };
  info?: Record<string, unknown>; // 未來拆分為 height, weight, birthday 等
  preferences?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
};
