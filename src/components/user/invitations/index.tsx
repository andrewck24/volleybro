"use client";
import { useRouter } from "next/navigation";
import { useProfile, useUserTeams } from "@/hooks/use-data";
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

export const Invitations = ({ className }: { className?: string }) => {
  const router = useRouter();
  const { profile, mutate: mutateProfile } = useProfile();
  const { teams, isLoading, mutate: mutateUserTeams } = useUserTeams();

  const handleAccept = async (teamId, accept) => {
    if (!window.confirm(accept ? "確認接受邀請？" : "確認拒絕邀請？")) return;
    const action = accept ? "accept" : "reject";
    try {
      const response = await fetch(
        `/api/users/teams?action=${action}&teamId=${teamId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        }
      );
      const userTeams = await response.json();
      mutateUserTeams();
      mutateProfile({ ...profile, teams: userTeams }, false);

      return accept ? router.push(`/team/${teamId}`) : null;
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>隊伍邀請</CardTitle>
      </CardHeader>
      {profile && !profile?.teams?.joined?.length && <Message />}
      <Table>
        <TableBody className="text-xl">
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4}>Loading...</TableCell>
            </TableRow>
          ) : (
            teams.inviting.map((team) => (
              <TableRow key={team._id}>
                <TableCell className="w-6 [&>svg]:size-6">
                  <RiGroupLine />
                </TableCell>
                <TableCell onClick={() => router.push(`/team/${team._id}`)}>
                  {team.name}
                </TableCell>
                <TableCell
                  className="w-6 [&>svg]:size-6 text-primary"
                  onClick={() => handleAccept(team._id, true)}
                >
                  <RiCheckLine />
                </TableCell>
                <TableCell
                  className="w-6 [&>svg]:size-6 text-destructive"
                  onClick={() => handleAccept(team._id, false)}
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
