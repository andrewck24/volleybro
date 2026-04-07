import { Card } from "@/components/ui/card";
import type { TMatchInfoForm } from "@/lib/features/game/types";
import { format } from "date-fns";
import { RiArrowRightWideLine, RiGroupLine } from "react-icons/ri";

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
          {info.time?.date instanceof Date
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
