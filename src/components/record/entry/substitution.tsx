import { Figure } from "@/components/custom/stats/figures";
import { EntryPlayerNumber, EntryText } from "@/components/record/entry";
import {
  type Player,
  type Substitution as TSubstitution,
} from "@/entities/record";
import { RiArrowDownWideLine, RiArrowUpWideLine } from "react-icons/ri";

export const Substitution = ({
  data,
  players,
}: {
  data: TSubstitution;
  players: Player[];
}) => {
  const inPlayer = players.find((p) => p._id === data.players.in);
  const outPlayer = players.find((p) => p._id === data.players.out);

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
