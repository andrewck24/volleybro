export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

declare const normalized: unique symbol;
export type NormalizedEmail = string & { readonly [normalized]: true };

export const normalizeEmail = (email: string) =>
  email.trim().toLowerCase() as NormalizedEmail;
