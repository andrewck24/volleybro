"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { RiLogoutBoxRLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import Menu from "@/components/user/menu";

const User = () => {
  const router = useRouter();

  const handleSignOut = async () => {
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
