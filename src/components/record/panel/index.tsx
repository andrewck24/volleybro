"use client";
import { RecordMoves } from "@/components/record/panel/moves";
import { Substitutes } from "@/components/record/panel/substitutes";
import { Panel } from "@/components/custom/panel";
import type { ReduxRecordState } from "@/lib/features/record/types";
import { useAppSelector } from "@/lib/redux/hooks";

export const RecordPanel = ({
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
    <Panel>
      {status.panel === "substitutes" ? (
        <Substitutes recordId={recordId} mode={mode} className={className} />
      ) : (
        <RecordMoves recordId={recordId} className={className} />
      )}
    </Panel>
  );
};
