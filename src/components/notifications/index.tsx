"use client";
import { GuidesForNewUser } from "@/components/custom/guides/new-user";
import { useActiveTeamId } from "@/hooks/use-data";

const Notifications = () => {
  const { teamId } = useActiveTeamId();

  return <>{!teamId && <GuidesForNewUser />}</>;
};

export default Notifications;
