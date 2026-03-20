"use client";
import { useRouter } from "next/navigation";
import { FiPlus } from "react-icons/fi";
import { RiGroupLine, RiCheckLine, RiCloseLine } from "react-icons/ri";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Link } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useUser } from "@/hooks/use-data";
import { useUserPlayers } from "@/hooks/use-data";
import { PlayerStatus } from "@/entities/player";
import { useToast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api/api-client";
import { showErrorToast } from "@/lib/api/error-toast";

export const Invitations = ({ className }: { className?: string }) => {
  const router = useRouter();
  const { user } = useUser();
  const { players, isLoading, mutate } = useUserPlayers(user?._id);
  const { toast } = useToast();

  const invitedPlayers = players.filter(
    (p) => p.status === PlayerStatus.INVITED
  );

  const handleAccept = async (playerId: string): Promise<void> => {
    try {
      await apiClient(`/api/players/${playerId}/invitations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });

      toast({ title: "邀請已接受", description: "您已加入隊伍" });
      mutate();
    } catch (err) {
      showErrorToast(err, toast);
    }
  };

  const handleReject = async (playerId: string): Promise<void> => {
    try {
      await apiClient(`/api/players/${playerId}/invitations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });

      toast({ title: "邀請已拒絕" });
      mutate();
    } catch (err) {
      showErrorToast(err, toast);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>隊伍邀請</CardTitle>
      </CardHeader>
      <Message />
      <Table>
        <TableBody className="text-xl">
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4}>Loading...</TableCell>
            </TableRow>
          ) : (
            invitedPlayers.map((player) => (
              <TableRow key={player._id}>
                <TableCell className="w-6 [&>svg]:size-6">
                  <RiGroupLine />
                </TableCell>
                <TableCell
                  onClick={() =>
                    player.teamId && router.push(`/team/${player.teamId}`)
                  }
                >
                  {player.name}
                </TableCell>
                <TableCell
                  className="w-6 [&>svg]:size-6 text-primary"
                  onClick={() => handleAccept(player._id)}
                >
                  <RiCheckLine />
                </TableCell>
                <TableCell
                  className="w-6 [&>svg]:size-6 text-destructive"
                  onClick={() => handleReject(player._id)}
                >
                  <RiCloseLine />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <Separator content="沒有找到你的隊伍嗎？你可以..." />
      <Link size="lg" href="/team/new">
        <FiPlus />
        建立隊伍
      </Link>
      <CardDescription className="text-center">
        或聯絡你的隊伍管理者
      </CardDescription>
    </Card>
  );
};

const Message = () => {
  return (
    <Alert className="w-full">
      <AlertTitle>歡迎使用 VolleyBro !</AlertTitle>
      <AlertDescription>
        請查看下方隊伍邀請。若您的隊伍是初次使用
        VolleyBro，請點選下方按鈕創建隊伍。
      </AlertDescription>
    </Alert>
  );
};
