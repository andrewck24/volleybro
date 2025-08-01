import { Card } from "@/components/ui/card";
import type { MatchResult as TMatchResult } from "@/entities/record";
import type { TMatchInfoForm } from "@/lib/features/record/types";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { RiArrowRightWideLine, RiGroupLine } from "react-icons/ri";

export const MatchResult = ({ match }: { match: TMatchResult }) => {
  const router = useRouter();

  return (
    <Card
      data-slot="MatchResult"
      onClick={() => router.push(`/match/${match._id}`)}
      className="flex flex-col gap-2 bg-card px-4 py-2 md:flex-row"
    >
      <div className="flex grow-0 flex-row items-center justify-center gap-2 md:flex-col">
        <p className="flex-1">{match.info.name || "no title"}</p>
        <p>
          {match.info.time.date
            ? format(new Date(match.info.time.date), "MMM. dd")
            : "no date"}
        </p>
      </div>
      <div className="flex-1 text-xl">
        <TeamInfo team={match.teams.home} isHome />
        <TeamInfo team={match.teams.away} isHome={false} />
      </div>
      <div className="flex flex-row items-center justify-end text-muted-foreground">
        查看比賽
        <RiArrowRightWideLine />
      </div>
    </Card>
  );
};

interface MatchInfoProps extends React.HTMLAttributes<HTMLDivElement> {
  info: TMatchInfoForm;
}

export const MatchInfo = ({ info, ...props }: MatchInfoProps) => {
  return (
    <Card
      data-slot="MatchInfo"
      className="flex flex-col gap-2 border-y-2 bg-card px-0 py-2 shadow-none"
      {...props}
    >
      <div className="flex grow-0 flex-row items-center justify-center gap-2 md:flex-col">
        <p className="flex-1 text-muted-foreground">
          {info.name || "新增賽事名稱"}
        </p>
      </div>
      <div className="flex flex-row items-center justify-center gap-2">
        <div className="flex-1 text-xl">
          <p className="flex flex-1 flex-row items-center gap-2">
            <RiGroupLine />
            {info.teams.home.name || "我方"}
          </p>
          <p className="flex flex-1 flex-row items-center gap-2">
            <RiGroupLine />
            {info.teams.away.name || "對手"}
          </p>
        </div>
        <div>
          {info.time.date instanceof Date
            ? format(info.time.date, "MMM. dd")
            : "時間未定"}
        </div>
      </div>
      <div className="flex flex-row items-center justify-end text-muted-foreground">
        編輯資訊
        <RiArrowRightWideLine />
      </div>
    </Card>
  );
};

const TeamInfo = ({
  team,
  isHome,
}: {
  team: TMatchResult["teams"]["home"];
  isHome: boolean;
}) => {
  return (
    <div className="flex flex-row items-center justify-start">
      <p className="flex flex-1 flex-row items-center gap-2">
        <RiGroupLine />
        {isHome ? team.name || "我方" : team.name || "對手"}
      </p>
      <div className="flex flex-0 flex-row items-center gap-2">
        <p className="text-3xl font-medium">{team.sets}</p>
        {team.scores.map(
          (score, index) =>
            score && (
              <p
                key={index}
                className="flex w-4 items-center justify-center text-lg"
              >
                {score}
              </p>
            ),
        )}
      </div>
    </div>
  );
};
