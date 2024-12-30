"use client";
import { useRecord } from "@/hooks/use-data";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { recordActions } from "@/lib/features/record/record-slice";
import { scoringMoves } from "@/lib/scoring-moves";
import { FiPlus, FiMinus } from "react-icons/fi";
import { RiSendPlaneLine } from "react-icons/ri";
import { Container, MoveButton } from "@/components/record/panels/moves";
import { createRally } from "@/lib/features/record/actions/create-rally";
import { updateRally } from "@/lib/features/record/actions/update-rally";
import {
  createRallyOptimistic,
  updateRallyOptimistic,
} from "@/lib/features/record/helpers";

const OppoMoves = ({ recordId }: { recordId: string }) => {
  const dispatch = useAppDispatch();
  const recordState = useAppSelector((state) => state.record);
  const {
    status: { setIndex, rallyIndex },
    recording,
  } = recordState[recordState.mode];
  const { record, mutate } = useRecord(recordId);

  const oppoMoves = scoringMoves.filter((option) =>
    scoringMoves[recording.home.num]?.outcome.includes(option.num)
  );

  const create = () => {
    mutate(
      createRally(
        { recordId, setIndex, rallyIndex: rallyIndex },
        recording,
        record
      ),
      {
        revalidate: false,
        optimisticData: createRallyOptimistic(
          { recordId, setIndex, rallyIndex },
          recording,
          record
        ),
      }
    );
    dispatch(recordActions.confirmRecordingRally(record));
  };

  const update = () => {
    mutate(updateRally({ recordId, setIndex, rallyIndex }, recording, record), {
      revalidate: false,
      optimisticData: updateRallyOptimistic(
        { recordId, setIndex, rallyIndex },
        recording,
        record
      ),
    });
    dispatch(recordActions.confirmRecordingRally(record));
    dispatch(recordActions.setRecordMode("general"));
  };

  const onOppoClick = async (move) => {
    if (recording.away.num !== move.num) {
      dispatch(recordActions.setRecordingAwayMove(move));
    } else {
      try {
        recordState.mode === "general" ? create() : update();
      } catch (error) {
        console.error("[POST /api/records]", error);
      }
    }
  };

  return (
    <Container className="grid-cols-1">
      {oppoMoves.map((move) => (
        <MoveButton
          key={`${move.type}-${move.num + 15}`}
          move={move}
          toggled={recording.away.num === move.num}
          onClick={() => onOppoClick(move)}
        >
          {move.type === 7 ? `我方${move.text}失誤` : `對方${move.text}`}
          {move.win ? <FiPlus /> : <FiMinus />}
          {recording.away.num === move.num && <RiSendPlaneLine />}
        </MoveButton>
      ))}
    </Container>
  );
};

export default OppoMoves;
