"use client";

import { authClient } from "@/lib/auth-client";
import { useActiveTeamPreference } from "@/hooks/use-active-team-preference";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { RiLogoutBoxRLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import Menu from "@/components/user/menu";

const User = () => {
  const router = useRouter();
  const { clear } = useActiveTeamPreference();
  const { mutate } = useSWRConfig();

  const handleSignOut = async () => {
    // Drop the cache first, then clear: a still-mounted consumer of
    // useActiveTeamId (the nav bar) would otherwise re-save a fallback team from cached data.
    await mutate(() => true, undefined, { revalidate: false });
    clear();
    await authClient.signOut();
    router.push("/auth/sign-in");
  };

  return (
    <>
      <Menu className="w-full" />
      <div className="grid w-full px-4">
        <Button variant="destructive" size="lg" onClick={handleSignOut}>
          <RiLogoutBoxRLine />
          登出
        </Button>
      </div>
    </>
  );
};

export default User;
