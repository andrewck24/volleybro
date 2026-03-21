"use client";
import { PlayersList } from "@/components/team/players/list";
import { Link } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BsGrid3X2Gap } from "react-icons/bs";
import { FiPlus } from "react-icons/fi";

const TeamPlayers = ({ teamId }: { teamId: string }) => {
  return (
    <Card>
      <div className="grid grid-cols-2 gap-2">
        <Link variant="secondary" size="lg" href={`/team/${teamId}/lineup`}>
          <BsGrid3X2Gap />
          編輯陣容
        </Link>
        <Link
          variant="secondary"
          size="lg"
          href={`/team/${teamId}/players/new`}
        >
          <FiPlus />
          新增成員
        </Link>
      </div>
      <PlayersList teamId={teamId} />
    </Card>
  );
};

export default TeamPlayers;
