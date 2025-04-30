"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecord } from "@/hooks/use-data";
import { createSubstitution } from "@/lib/features/record/actions/create-substitution";
import { createSubstitutionHelper } from "@/lib/features/record/helpers";
import { useSubstitutes } from "@/lib/features/record/hooks/use-substitutes";
import { recordActions } from "@/lib/features/record/record-slice";
import type { ReduxRecordState } from "@/lib/features/record/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { RiArrowLeftWideLine, RiCheckLine } from "react-icons/ri";

const Substitutes = ({
  recordId,
  mode,
  className,
}: {
  recordId: string;
  mode: ReduxRecordState["mode"];
  className?: string;
}) => {
  const dispatch = useAppDispatch();
  const { record, mutate } = useRecord(recordId);
  const { setIndex } = useAppSelector((state) => state.record);
  const { status, recording } = useAppSelector((state) => state.record[mode]);
  const { entryIndex } = status;
  const substitutes = useSubstitutes(recordId, {
    setIndex,
    entryIndex,
    recording,
  });

  const onSubmit = async () => {
    try {
      mutate(
        createSubstitution(
          { recordId, setIndex, entryIndex },
          recording.substitution,
          record,
        ),
        {
          revalidate: false,
          optimisticData: createSubstitutionHelper(
            { recordId, setIndex, entryIndex },
            recording.substitution,
            record,
          ),
        },
      );
      dispatch(recordActions.confirmRecordingSubstitution());
    } catch (error) {
      console.error("[POST /api/records/sets/substitution]", error);
    }
  };

  return (
    <Card className={cn("w-full flex-1 pb-4", className)}>
      <CardHeader>
        <CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch(recordActions.resetRecordingSubstitution())}
          >
            <RiArrowLeftWideLine />
          </Button>
          選擇替補球員
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {substitutes.map((substitute) => {
          const toggled =
            recording?.substitution?.players?.in === substitute._id;
          return (
            <Button
              key={substitute._id}
              variant={toggled ? "default" : "outline"}
              size="wide"
              className="text-xl"
              onClick={() =>
                dispatch(
                  recordActions.setRecordingSubstitution(
                    toggled ? null : substitute._id,
                  ),
                )
              }
            >
              <span className="flex basis-8 justify-end font-semibold">
                {substitute.number}
              </span>
              {substitute.name}
            </Button>
          );
        })}
      </CardContent>
      <Button size="lg" className="text-xl" onClick={onSubmit}>
        <RiCheckLine />
        確認
      </Button>
    </Card>
  );
};

export default Substitutes;
