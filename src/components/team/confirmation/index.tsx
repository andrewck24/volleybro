"use client";
import { useRouter } from "next/navigation";
import { useProfile, useUserTeams } from "@/hooks/use-data";
import { RiCheckLine, RiCloseLine } from "react-icons/ri";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const ConfirmInvitation = ({
  teamId,
  className,
}: {
  teamId: string;
  className?: string;
}) => {
  const router = useRouter();
  const { profile, mutate: mutateProfile } = useProfile();
  const { mutate: mutateUserTeams } = useUserTeams();
  const isInviting = profile?.teams.inviting.find(
    (team: any) => team.toString() === teamId
  );

  const handleAccept = async (teamId: string, accept: boolean) => {
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

      if (accept) return;

      return router.push("/user/invitations");
    } catch (error) {
      console.log(error);
    }
  };
  if (!isInviting) return null;

  return (
    <Alert className={className}>
      <RiCheckLine />
      <AlertTitle>是否接受此隊伍邀請？</AlertTitle>
      <AlertDescription>這個隊伍想邀請您加入成為他們的成員。</AlertDescription>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => handleAccept(teamId, true)}>
          <RiCheckLine />
          同意邀請
        </Button>
        <Button
          variant="destructive"
          onClick={() => handleAccept(teamId, false)}
        >
          <RiCloseLine />
          拒絕邀請
        </Button>
      </div>
    </Alert>
  );
};

export default ConfirmInvitation;
