import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { recordActions } from "@/lib/features/record/record-slice";
import { useLineup } from "@/lib/features/record/hooks/use-lineup";
import {
  Court,
  Outside,
  Inside,
  PlayerCard,
  SubIndicator,
  AdjustButton,
  PlaceholderCard,
} from "@/components/custom/court";
import type { ReduxRecordState } from "@/lib/features/record/types";

const RecordCourt = ({
  recordId,
  mode,
}: {
  recordId: string;
  mode: ReduxRecordState["mode"];
}) => {
  const dispatch = useAppDispatch();
  const { status, recording } = useAppSelector((state) => state.record[mode]);
  const { starting, liberos } = useLineup(recordId, status);

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
            {player.sub?._id && !player.sub?.rallyIndex?.out && (
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
                })
              )
            }
          >
            {player.sub?._id && !player.sub?.rallyIndex?.out && (
              <SubIndicator number={player.sub.number} />
            )}
          </PlayerCard>
        ))}
      </Inside>
    </Court>
  );
};

export default RecordCourt;
