import { Figure } from "@/components/custom/stats/figures";
import { EntryPlayerNumber, EntryText } from "@/components/game/entry";
import type {
  GamePlayerView,
  SubstitutionView,
} from "@/lib/features/game/types";
import { RiArrowDownWideLine, RiArrowUpWideLine } from "react-icons/ri";

export const Substitution = ({
  data,
  players,
}: {
  data: SubstitutionView;
  players: GamePlayerView[];
}) => {
  const inPlayer = players.find((p) => p.id === data.players.in);
  const outPlayer = players.find((p) => p.id === data.players.out);

  return (
    <>
      <Figure size="sm" />
      <Figure size="sm" />
      <EntryText>
        <EntryPlayerNumber>{outPlayer?.number}</EntryPlayerNumber>
        OUT
        <RiArrowDownWideLine className="text-destructive" />
      </EntryText>
      <EntryText>
        <EntryPlayerNumber>{inPlayer?.number}</EntryPlayerNumber>
        IN
        <RiArrowUpWideLine className="text-primary" />
      </EntryText>
    </>
  );
};
