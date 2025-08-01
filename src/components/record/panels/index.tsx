"use client";
import { RecordMoves } from "@/components/record/panels/moves";
import { Substitutes } from "@/components/record/panels/substitutes";
import { Panels } from "@/components/ui/panels";
import type { ReduxRecordState } from "@/lib/features/record/types";
import { useAppSelector } from "@/lib/redux/hooks";

export const RecordPanels = ({
  recordId,
  mode,
  className,
}: {
  recordId: string;
  mode: ReduxRecordState["mode"];
  className?: string;
}) => {
  const { status } = useAppSelector((state) => state.record[mode]);

  return (
    <Panels>
      {status.panel === "substitutes" ? (
        <Substitutes recordId={recordId} mode={mode} className={className} />
      ) : (
        <RecordMoves recordId={recordId} className={className} />
      )}
    </Panels>
  );
};
