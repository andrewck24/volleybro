export type Profile = {
  id: string;
  userId: string;
  activeTeamId?: string;
  info?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
};
