"use client";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useRecord } from "@/hooks/use-data";
import { recordActions } from "@/lib/features/record/record-slice";
import { RiArrowLeftWideLine, RiArrowRightWideLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Entry from "@/components/record/entry";

const RecordOptionsSummary = ({ recordId }: { recordId: string }) => {
  const dispatch = useAppDispatch();
  const { record } = useRecord(recordId);
  const { setIndex, inProgress } = useAppSelector(
    (state) => state.record.editing.status
  );
  const set = inProgress ? setIndex : setIndex - 1;
  const { entries } = record.sets[set];
  const { players } = record.teams.home;

  const handleEntryClick = (entryIndex: number) => {
    dispatch(
      recordActions.setEditingEntryStatus({ record, setIndex: set, entryIndex })
    );
  };

  return (
    <>
      <div className="flex flex-row items-center w-full">
        <Button
          size="icon"
          className="size-8"
          onClick={() => dispatch(recordActions.setSetIndex(set - 1))}
          disabled={set <= 0}
        >
          <RiArrowLeftWideLine />
          <span className="sr-only">last set</span>
        </Button>
        <span className="flex-1 text-xl text-center">
          第 {set + 1} 局逐球紀錄
        </span>
        <Button
          size="icon"
          className="size-8"
          onClick={() => dispatch(recordActions.setSetIndex(set + 1))}
          disabled={set >= record.sets.length - 1}
        >
          <RiArrowRightWideLine />
          <span className="sr-only">next set</span>
        </Button>
      </div>
      <div className="flex flex-col-reverse gap-1">
        <Separator content="比賽開始" />
        {entries.map((entry, entryIndex: number) => (
          <Entry
            key={entryIndex}
            entry={entry}
            players={players}
            onClick={() => handleEntryClick(entryIndex)}
          />
        ))}
      </div>
    </>
  );
};

export default RecordOptionsSummary;
