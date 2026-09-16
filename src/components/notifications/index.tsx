"use client";
import { GuidesForNewUser } from "@/components/custom/guides/new-user";
import { useActiveTeamId } from "@/hooks/use-data";

const Notifications = () => {
  const { teamId, isLoading } = useActiveTeamId();

  return <>{!teamId && !isLoading && <GuidesForNewUser />}</>;
};

export default Notifications;
