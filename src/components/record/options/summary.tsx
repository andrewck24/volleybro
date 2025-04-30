"use client";
import Entry from "@/components/record/entry";
import { Separator } from "@/components/ui/separator";
import { useRecord } from "@/hooks/use-data";
import { recordActions } from "@/lib/features/record/record-slice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";

const RecordOptionsSummary = ({ recordId }: { recordId: string }) => {
  const dispatch = useAppDispatch();
  const { record } = useRecord(recordId);
  const { setIndex } = useAppSelector((state) => state.record);
  const { entries } = record.sets[setIndex];
  const { players } = record.teams.home;

  const handleEntryClick = (entryIndex: number) => {
    dispatch(recordActions.setEditingEntryStatus({ record, entryIndex }));
  };

  return (
    <>
      <div className="flex w-full flex-row items-center text-xl">
        第 {setIndex + 1} 局逐球紀錄
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
