"use client";
import { GuidesForNewUser } from "@/components/custom/guides/new-user";
import { TeamMatches } from "@/components/home/matches";
import { useProfile, useActiveTeamId } from "@/hooks/use-data";
import LoadingCard from "@/components/custom/loading/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RiAlertLine } from "react-icons/ri";

const Home = () => {
  const { isLoading, error } = useProfile();
  const defaultTeamId = useActiveTeamId();

  if (isLoading) {
    return <LoadingCard className="w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <RiAlertLine />
        <AlertTitle>載入失敗</AlertTitle>
        <AlertDescription>
          無法載入使用者資料，請稍後再試或聯絡系統管理員
        </AlertDescription>
      </Alert>
    );
  }

  if (!defaultTeamId) return <GuidesForNewUser />;

  return <TeamMatches teamId={defaultTeamId} />;
};

export default Home;
