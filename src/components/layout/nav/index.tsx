import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { NavLinks } from "@/components/layout/nav/links";

export const Nav = async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  return <NavLinks session={session} />;
};
