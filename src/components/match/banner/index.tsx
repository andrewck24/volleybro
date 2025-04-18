"use client";
import { Scores } from "@/components/match/banner/scores";
import { Teams } from "@/components/match/banner/teams";
import { Button, Link } from "@/components/ui/button";
import { Match, MatchPhase } from "@/entities/record";
import { useRecord } from "@/hooks/use-data";
import { RiFileListLine, RiInformationLine } from "react-icons/ri";

export const Banner = ({ recordId }: { recordId: string }) => {
  const { record } = useRecord(recordId);

  return (
    <div className="flex w-full flex-col items-center justify-center bg-card px-4 py-2">
      <Info info={record.info} />
      <Teams record={record} />
      <Scores sets={record.sets} />
      <div className="grid w-full grid-cols-2 gap-2 py-2">
        <Button onClick={() => {}} variant="outline" size="lg">
          <RiInformationLine />
          賽事資訊
        </Button>
        <Link href={`/match/${recordId}/sets`} size="lg">
          <RiFileListLine />
          賽事記錄
        </Link>
      </div>
    </div>
  );
};

const Info = ({ info }: { info: Match }) => {
  const { name, phase, number, location } = info;

  return (
    <div className="flex w-full flex-col items-center justify-center px-4 pt-2 text-muted-foreground">
      <p>
        {name || "未知賽事"}
        {phase !== MatchPhase.NONE && ` - ${phase}`}
        {number && ` - #${number}`}
      </p>
      <p>
        {location.hall || "未知場地"}
        {location.city && `, ${location.city}`}
      </p>
    </div>
  );
};
