import {
  EntryPlayerNumber,
  EntryScore,
  EntryText,
} from "@/components/record/entry";
import { type Player, type Rally as TRally, MoveType } from "@/entities/record";
import { scoringMoves } from "@/lib/scoring-moves";
import { FiMinus, FiPlus } from "react-icons/fi";
import { RiUserLine } from "react-icons/ri";

export const Rally = ({
  data,
  players,
}: {
  data: TRally;
  players: Player[];
}) => {
  const { win, home, away } = data;
  const playerNumber = players.find((p) => p._id === home.player._id)?.number;

  return (
    <>
      {home.type ? (
        <>
          <EntryScore win={win}>{home.score}</EntryScore>
          <EntryScore win={!win}>{away.score}</EntryScore>
        </>
      ) : (
        <>
          <EntryScore>{home.score}</EntryScore>
          <EntryScore>{away.score}</EntryScore>
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
