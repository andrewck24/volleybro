"use client";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { PanelContent } from "@/components/custom/panel";
import { Separator } from "@/components/ui/separator";
import type { Player } from "@/entities/player";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { LineupOptionMode } from "@/lib/features/team/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  RiArrowLeftWideLine,
  RiUserFollowLine,
  RiUserLine,
} from "react-icons/ri";

interface SubstitutesProps {
  players: Player[];
  others: Player[];
}

export const Substitutes = ({ players, others }: SubstitutesProps) => {
  const dispatch = useAppDispatch();
  const { lineups, status } = useAppSelector((state) => state.lineup);
  const liberoCount = lineups[status.lineupIndex].liberos.length;
  const substituteCount = lineups[status.lineupIndex].substitutes.length;
  const substituteLimit = liberoCount < 2 ? 6 - liberoCount : 6;
  const isSubstituteFull = substituteCount >= substituteLimit;
  const isEditingStarting = !!status.editingMember.zone;

  const handleSubstituteClick = (player: Player, index: number) => {
    if (isEditingStarting) {
      dispatch(
        lineupActions.replaceEditingPlayer({
          _id: player._id,
          list: "substitutes",
          zone: index + 1,
        }),
      );
    } else {
      dispatch(lineupActions.removeSubstitutePlayer(player._id));
    }
  };

  const handleOtherClick = (player: Player, index: number) => {
    if (isEditingStarting) {
      dispatch(
        lineupActions.replaceEditingPlayer({
          _id: player._id,
          list: "",
          zone: index + 1,
        }),
      );
    } else if (!isSubstituteFull) {
      dispatch(lineupActions.addSubstitutePlayer(player._id));
    }
  };

  return (
    <PanelContent>
      <CardHeader className="h-9 w-full flex-row items-center justify-start">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 [&>svg]:size-5"
          onClick={() =>
            dispatch(lineupActions.setOptionMode(LineupOptionMode.PLAYERINFO))
          }
        >
          <RiArrowLeftWideLine />
        </Button>
        <CardTitle>{`替補名單 (${substituteCount}/${substituteLimit})`}</CardTitle>
      </CardHeader>
      {lineups[status.lineupIndex].substitutes.map((lineupPlayer, index) => {
        const player = players.find((p) => p._id === lineupPlayer._id);
        if (!player) return null;
        return (
          <Button
            key={player._id}
            variant={isEditingStarting ? "outline" : "default"}
            size="wide"
            onClick={() => handleSubstituteClick(player, index)}
            className="text-xl"
          >
            <RiUserFollowLine />
            <span className="flex basis-8 justify-end font-semibold">
              {player?.number || " "}
            </span>
            {player?.name}
          </Button>
        );
      })}
      <Separator content="以上為正式比賽 12 + 2 人名單" />
      {others.map((player, index) => {
        return (
          <Button
            key={player._id}
            variant="outline"
            size="wide"
            onClick={() => handleOtherClick(player, index)}
            className="text-xl"
          >
            <RiUserLine />
            <span className="flex basis-8 justify-end font-semibold">
              {player?.number}
            </span>
            {player?.name}
          </Button>
        );
      })}
    </PanelContent>
  );
};
