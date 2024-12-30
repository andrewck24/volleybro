"use client";
import { useRecord } from "@/hooks/use-data";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import Entry from "@/components/record/entry";
import { EntryType } from "@/entities/record";
import type { ReduxRecordState } from "@/lib/features/record/types";

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
  const {
    recording,
    status: { inProgress, setIndex, rallyIndex },
  } = useAppSelector((state) => state.record[mode]);

  if (!inProgress) return null;

  const lastRally = record.sets[setIndex].rallies[rallyIndex - 1];
  const isEditing = recording.home.player._id || recording.home.type;
  const recordingEntry = recording.substitution
    ? { type: EntryType.SUBSTITUTION, data: recording.substitution }
    : recording.timeout
    ? { type: EntryType.TIMEOUT, data: recording.timeout }
    : recording.challenge
    ? { type: EntryType.CHALLENGE, data: recording.challenge }
    : { type: EntryType.RALLY, data: recording };
  const entry = isEditing || rallyIndex === 0 ? recordingEntry : lastRally;

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
