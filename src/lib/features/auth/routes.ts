export const publicRoutes: string[] = ["/"];

/**
 * An array of routes that are used for authentication.
 * These routes will redirect signed in users to the home page.
 * @type {string[]} - An array of route paths.
 */
export const authRoutes: string[] = [
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/error",
];

export const apiAuthPrefix: string = "/api/auth";

export const DEFAULT_SIGN_IN_REDIRECT: string = "/home";

export const DEFAULT_SIGN_UP_REDIRECT: string = "/user/invitations";
