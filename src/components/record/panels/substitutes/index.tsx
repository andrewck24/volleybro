"use client";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { recordActions } from "@/lib/features/record/record-slice";
import { useRecord } from "@/hooks/use-data";
import { useSubstitutes } from "@/lib/features/record/hooks/use-substitutes";
import { RiArrowLeftWideLine, RiCheckLine } from "react-icons/ri";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createSubstitution } from "@/lib/features/record/actions/create-substitution";
import { createSubstitutionOptimistic } from "@/lib/features/record/helpers";
import type { ReduxRecordState } from "@/lib/features/record/types";

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
  const { status, recording } = useAppSelector((state) => state.record[mode]);
  const { setIndex, rallyIndex } = status;
  const substitutes = useSubstitutes(recordId, { status, recording });

  const onSubmit = async () => {
    try {
      mutate(
        createSubstitution(
          { recordId, setIndex, rallyIndex },
          recording.substitution,
          record
        ),
        {
          revalidate: false,
          optimisticData: createSubstitutionOptimistic(
            { recordId, setIndex, rallyIndex },
            recording.substitution,
            record
          ),
        }
      );
      dispatch(recordActions.confirmRecordingSubstitution());
    } catch (error) {
      console.error("[POST /api/records/sets/substitution]", error);
    }
  };

  return (
    <Card className={cn("flex-1 w-full pb-4", className)}>
      <CardHeader>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => dispatch(recordActions.resetRecordingSubstitution())}
        >
          <RiArrowLeftWideLine />
        </Button>
        <CardTitle>選擇替補球員</CardTitle>
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
                    toggled ? null : substitute._id
                  )
                )
              }
            >
              <span className="flex justify-end font-semibold basis-8">
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
