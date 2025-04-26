"use client";
import { Button } from "@/components/ui/button";
import { PanelContent, PanelHeader, PanelTitle } from "@/components/ui/panels";
import { Separator } from "@/components/ui/separator";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { LineupOptionMode } from "@/lib/features/team/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  RiArrowLeftWideLine,
  RiUserFollowLine,
  RiUserLine,
} from "react-icons/ri";

export const Substitutes = ({ members, others }) => {
  const dispatch = useAppDispatch();
  const { lineups, status } = useAppSelector((state) => state.lineup);
  const liberoCount = lineups[status.lineupIndex].liberos.length;
  const substituteCount = lineups[status.lineupIndex].substitutes.length;
  const substituteLimit = liberoCount < 2 ? 6 - liberoCount : 6;
  const isSubstituteFull = substituteCount >= substituteLimit;
  const isEditingStarting = !!status.editingMember.zone;

  const handleSubstituteClick = (member, index) => {
    if (isEditingStarting) {
      dispatch(
        lineupActions.replaceEditingPlayer({
          _id: member._id,
          list: "substitutes",
          zone: index + 1,
        }),
      );
    } else {
      dispatch(lineupActions.removeSubstitutePlayer(member._id));
    }
  };

  const handleOtherClick = (member, index) => {
    if (isEditingStarting) {
      dispatch(
        lineupActions.replaceEditingPlayer({
          _id: member._id,
          list: "",
          zone: index + 1,
        }),
      );
    } else if (!isSubstituteFull) {
      dispatch(lineupActions.addSubstitutePlayer(member._id));
    }
  };

  return (
    <PanelContent>
      <PanelHeader>
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
        <PanelTitle>{`替補名單 (${substituteCount}/${substituteLimit})`}</PanelTitle>
      </PanelHeader>
      {lineups[status.lineupIndex].substitutes.map((player, index) => {
        const member = members.find((m) => m._id === player._id);
        return (
          <Button
            key={member._id}
            variant={isEditingStarting ? "outline" : "default"}
            size="wide"
            onClick={() => handleSubstituteClick(member, index)}
            className="text-xl"
          >
            <RiUserFollowLine />
            <span className="flex basis-8 justify-end font-semibold">
              {member.number || " "}
            </span>
            {member.name}
          </Button>
        );
      })}
      <Separator content="以上為正式比賽 12 + 2 人名單" />
      {others.map((member, index) => {
        return (
          <Button
            key={member._id}
            variant="outline"
            size="wide"
            onClick={() => handleOtherClick(member, index)}
            className="text-xl"
          >
            <RiUserLine />
            <span className="flex basis-8 justify-end font-semibold">
              {member.number}
            </span>
            {member.name}
          </Button>
        );
      })}
    </PanelContent>
  );
};
