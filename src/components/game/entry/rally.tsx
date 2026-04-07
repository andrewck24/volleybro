import { Figure } from "@/components/custom/stats/figures";
import { EntryPlayerNumber, EntryText } from "@/components/game/entry";
import { MoveType } from "@/entities/game";
import type { GamePlayerView, RallyView } from "@/lib/features/game/types";
import { scoringMoves } from "@/lib/scoring-moves";
import { FiMinus, FiPlus } from "react-icons/fi";
import { RiUserLine } from "react-icons/ri";

export const Rally = ({
  data,
  players,
}: {
  data: RallyView;
  players: GamePlayerView[];
}) => {
  const { win, home, away } = data;
  const playerNumber = players.find((p) => p.id === home.player?.id)?.number;

  return (
    <>
      {home.type ? (
        <>
          <Figure
            value={home.score}
            size="sm"
            variant={win ? "primary" : "secondary"}
          />
          <Figure
            value={away.score}
            size="sm"
            variant={win ? "secondary" : "destructive"}
          />
        </>
      ) : (
        <>
          <Figure value={home.score} size="sm" variant="secondary" />
          <Figure value={away.score} size="sm" variant="secondary" />
        </>
      )}
      <EntryText className="border-primary">
        {home.type ? (
          home.type !== MoveType.UNFORCED ? (
            <>
              <EntryPlayerNumber>{playerNumber}</EntryPlayerNumber>
              {scoringMoves[home.num]?.text}
              {home.type && (win ? <IconWin /> : <IconLose />)}
            </>
          ) : (
            <>--</>
          )
        ) : (
          <EntryPlayerNumber>{playerNumber}</EntryPlayerNumber>
        )}
      </EntryText>
      <EntryText className="border-destructive">
        {away.type &&
          (away.type !== MoveType.UNFORCED ? (
            <>
              <span className="flex size-6 items-center justify-center rounded-full bg-destructive text-primary-foreground">
                <RiUserLine />
              </span>
              {scoringMoves[away.num]?.text}
              {win ? <IconLose /> : <IconWin />}
            </>
          ) : (
            <>--</>
          ))}
      </EntryText>
    </>
  );
};

const IconWin = () => <FiPlus className="text-primary" />;

const IconLose = () => <FiMinus className="text-destructive" />;
