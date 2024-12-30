import { useRouter } from "next/navigation";
import { RiGroupLine, RiArrowRightWideLine } from "react-icons/ri";
import { type Record } from "@/entities/record";

const Result = ({ record }: { record: Record }) => {
  const router = useRouter();
  const renderTeamInfo = (record: Record, isHome: boolean) => (
    <div className="flex flex-row items-center justify-start">
      <p className="flex flex-row items-center flex-1 gap-2">
        <RiGroupLine />
        {isHome
          ? record.teams.home.name || "我方"
          : record.teams.away.name || "對手"}
      </p>
      <div className="flex flex-row items-center gap-2 flex-0">
        <p className="text-3xl font-medium">
          {record.sets.filter((set) => set.win).length}
        </p>
        {record.sets.map((set, index) => (
          <p
            key={index}
            className="flex items-center justify-center w-4 text-lg"
          >
            {set.rallies.filter((rally) => rally.win === isHome).length}
          </p>
        ))}
      </div>
    </div>
  );

  return (
    <div
      onClick={() => router.push(`/record/${record._id}`)}
      className="flex flex-col gap-2 px-4 py-2 bg-background md:flex-row"
    >
      <div className="flex flex-row items-center justify-center flex-grow-0 gap-2 md:flex-col">
        <p className="flex-1">{record.info.name || "no title"}</p>
        <p>{record.info.time.date || "no date"}</p>
      </div>
      <div className="flex-1 text-xl">
        {renderTeamInfo(record, true)}
        {renderTeamInfo(record, false)}
      </div>
      <div className="flex flex-row items-center justify-end text-muted-foreground">
        查看比賽
        <RiArrowRightWideLine />
      </div>
    </div>
  );
};

export default Result;
