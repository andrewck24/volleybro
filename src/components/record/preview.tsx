"use client";
import Entry from "@/components/record/entry";
import { Card } from "@/components/ui/card";
import { type Entry as IEntry, EntryType } from "@/entities/record";
import { useRecord } from "@/hooks/use-data";
import type { ReduxRecordState } from "@/lib/features/record/types";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";

const RecordPreview = ({
  recordId,
  mode,
  handleOptionOpen,
  className,
}: {
  recordId: string;
  mode: ReduxRecordState["mode"];
  handleOptionOpen?: (value: string) => void;
  className?: string;
}) => {
  const { record } = useRecord(recordId);
  const { players } = record.teams.home;
  const { setIndex } = useAppSelector((state) => state.record);
  const {
    recording,
    status: { inProgress, entryIndex },
  } = useAppSelector((state) => state.record[mode]);

  if (!inProgress) return null;

  const lastEntry = record.sets[setIndex].entries[entryIndex - 1];
  const isEditing = recording.home.player._id || recording.home.type;
  const recordingEntry: IEntry = recording.substitution
    ? { type: EntryType.SUBSTITUTION, data: recording.substitution }
    : recording.timeout
      ? { type: EntryType.TIMEOUT, data: recording.timeout }
      : recording.challenge
        ? { type: EntryType.CHALLENGE, data: recording.challenge }
        : { type: EntryType.RALLY, data: recording };
  const entry = isEditing || entryIndex === 0 ? recordingEntry : lastEntry;

  return (
    <Card className={cn("grid w-full p-2", className)}>
      <Entry
        entry={entry}
        players={players}
        onClick={handleOptionOpen ? () => handleOptionOpen("summary") : null}
        className={isEditing ? "animate-pulse duration-1000" : ""}
      />
    </Card>
  );
};

export default RecordPreview;
