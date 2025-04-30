"use client";
import {
  AdjustButton,
  Court,
  Inside,
  Outside,
  PlaceholderCard,
  PlayerCard,
  SubIndicator,
} from "@/components/custom/court";
import { useLineup } from "@/lib/features/record/hooks/use-lineup";
import { recordActions } from "@/lib/features/record/record-slice";
import type { ReduxRecordState } from "@/lib/features/record/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";

const RecordCourt = ({
  recordId,
  mode,
}: {
  recordId: string;
  mode: ReduxRecordState["mode"];
}) => {
  const dispatch = useAppDispatch();
  const { setIndex } = useAppSelector((state) => state.record);
  const { status, recording } = useAppSelector((state) => state.record[mode]);
  const { starting, liberos } = useLineup(recordId, setIndex, status);

  if (status.inProgress === false) {
    return (
      <Court>
        <Outside className="inner">
          {Array.from({ length: 3 }).map((_, index) => (
            <PlaceholderCard key={index} />
          ))}
        </Outside>
        <Inside>
          {Array.from({ length: 6 }).map((_, index) => (
            <PlaceholderCard key={index} />
          ))}
        </Inside>
      </Court>
    );
  }

  return (
    <Court>
      <Outside className="inner">
        <AdjustButton />
        {liberos.map((player, index) => (
          <PlayerCard
            key={index}
            player={player}
            toggled={recording.home.player._id === player._id}
            list="liberos"
            zone={-(index + 1)}
            onClick={() => {}}
          >
            {player.sub?._id && !player.sub?.entryIndex?.out && (
              <SubIndicator number={player.sub.number} />
            )}
          </PlayerCard>
        ))}
      </Outside>
      <Inside>
        {starting.map((player, index) => (
          <PlayerCard
            key={index}
            player={player}
            toggled={recording.home.player._id === player._id}
            list="starting"
            zone={index + 1}
            onClick={() =>
              dispatch(
                recordActions.setRecordingPlayer({
                  _id: player._id,
                  zone: index + 1,
                }),
              )
            }
          >
            {player.sub?._id && !player.sub?.entryIndex?.out && (
              <SubIndicator number={player.sub.number} />
            )}
          </PlayerCard>
        ))}
      </Inside>
    </Court>
  );
};

export default RecordCourt;
