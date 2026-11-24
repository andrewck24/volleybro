"use client";

import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { GuidesForNewUser } from "@/components/custom/guides/new-user";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveTeamId } from "@/hooks/use-data";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export const TeamEntry = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { teamId, isLoading, hasLoadedMemberships, error, retry } =
    useActiveTeamId();

  useEffect(() => {
    if (pathname === "/team" && teamId) {
      router.replace(`/team/${encodeURIComponent(teamId)}`);
    }
  }, [pathname, router, teamId]);

  if (isLoading || teamId || (!error && !hasLoadedMemberships)) {
    return (
      <div className="p-2" role="status" aria-label="載入球隊中">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <ServerErrorState className="m-2" onRetry={() => retry()} />;
  }

  return <GuidesForNewUser />;
};
