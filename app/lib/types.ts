export type ActionResult<T = null> =
  | { data: T; error: null }
  | { data: null; error: string };

export const ROUTES = {
  HOME: "/home",
  LOGIN: "/login",
  REGISTER: "/register",
  PROFILE: (username: string) => `/${username}`,
  SEARCH: "/search",
} as const;
