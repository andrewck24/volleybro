export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();
