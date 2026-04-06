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
import { gameActions } from "@/lib/features/game/game-slice";
import { useLineup } from "@/lib/features/game/hooks/use-lineup";
import type { ReduxGameState } from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";

export const GameCourt = ({
  gameId,
  mode,
}: {
  gameId: string;
  mode: ReduxGameState["mode"];
}) => {
  const dispatch = useAppDispatch();
  const { setIndex } = useAppSelector((state) => state.game);
  const { status, entryDraft: draft } = useAppSelector(
    (state) => state.game[mode],
  );
  const { starting, liberos } = useLineup(gameId, setIndex, status);

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
            player={player as Parameters<typeof PlayerCard>[0]["player"]}
            toggled={draft.home.player?.id === player.id}
            list="liberos"
            zone={-(index + 1)}
            onClick={() => {}}
          >
            {player.sub?.id && !player.sub?.entryIndex?.out && (
              <SubIndicator number={player.sub.number ?? 0} />
            )}
          </PlayerCard>
        ))}
      </Outside>
      <Inside>
        {starting.map((player, index) => (
          <PlayerCard
            key={index}
            player={player as Parameters<typeof PlayerCard>[0]["player"]}
            toggled={draft.home.player?.id === player.id}
            list="starting"
            zone={index + 1}
            onClick={() =>
              dispatch(
                gameActions.setEntryDraftPlayer({
                  id: player.id!,
                  zone: index + 1,
                }),
              )
            }
          >
            {player.sub?.id && !player.sub?.entryIndex?.out && (
              <SubIndicator number={player.sub.number ?? 0} />
            )}
          </PlayerCard>
        ))}
      </Inside>
    </Court>
  );
};
