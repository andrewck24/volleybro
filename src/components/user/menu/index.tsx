"use client";
import { Button, Link } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ItemAvatar } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { DarkMode } from "@/components/user/menu/dark-mode";
import { useUser } from "@/hooks/use-data";
import { RiSettings4Line, RiUserLine } from "react-icons/ri";

const Menu = ({ className }: { className?: string }) => {
  const { user } = useUser();

  return (
    <Card className={className}>
      <Button size="wide">
        <ItemAvatar
          className="size-6"
          src={user?.image}
          alt={user?.name}
          fallback={<RiUserLine />}
        />
        {!user ? <Skeleton className="h-6 w-64" /> : user?.name}
      </Button>
      <Link variant="secondary" size="wide" href="/user/invitations">
        查看邀請
      </Link>
      <Button variant="secondary" size="wide">
        <RiSettings4Line />
        設定
      </Button>
      <DarkMode />
    </Card>
  );
};

export default Menu;
