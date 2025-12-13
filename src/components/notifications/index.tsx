"use client";
import { GuidesForNewUser } from "@/components/custom/guides/new-user";
import { useProfile } from "@/hooks/use-data";

const Notifications = () => {
  const { profile } = useProfile();
  const defaultTeamId = profile?.teams?.joined[0];

  return <>{!defaultTeamId && <GuidesForNewUser />}</>;
};

export default Notifications;
