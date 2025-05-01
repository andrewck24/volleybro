"use client";
import { Button } from "@/components/ui/button";
import { PanelContent, PanelHeader, PanelTitle } from "@/components/ui/panels";
import { Position } from "@/entities/team";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { LineupOptionMode } from "@/lib/features/team/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { RiArrowLeftWideLine } from "react-icons/ri";

export const positions = [
  {
    text: "舉球 (二傳, Setter)",
    value: Position.S,
  },
  {
    text: "主攻 (大砲, Outside Hitter)",
    value: Position.OH,
  },
  {
    text: "快攻 (攔中, Middle Blocker)",
    value: Position.MB,
  },
  {
    text: "副攻 (舉對, Opposite Hitter)",
    value: Position.OP,
  },
  {
    text: "自由 (Libero)",
    value: Position.L,
  },
];

export const Positions = () => {
  const dispatch = useAppDispatch();
  const { lineups, status } = useAppSelector((state) => state.lineup);
  const { list, zone } = status.editingMember;
  const toggledPosition = lineups[status.lineupIndex][list][zone - 1].position;
  const isEditingLiberos = list === "liberos";

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
        <PanelTitle>選擇位置</PanelTitle>
      </PanelHeader>
      {positions.map((position) => (
        <Button
          key={position.value}
          variant={toggledPosition === position.value ? "default" : "outline"}
          size="wide"
          onClick={() =>
            dispatch(lineupActions.setPlayerPosition(position.value))
          }
          disabled={
            position.value === "L" ? !isEditingLiberos : isEditingLiberos
          }
          className="text-xl"
        >
          <span className="flex basis-8 justify-end font-semibold">
            {position.value}
          </span>
          <span className="flex flex-1 justify-start">{position.text}</span>
        </Button>
      ))}
    </PanelContent>
  );
};
