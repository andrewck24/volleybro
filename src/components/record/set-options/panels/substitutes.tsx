"use client";
import { Button } from "@/components/ui/button";
import { PanelContent, PanelHeader, PanelTitle } from "@/components/ui/panels";
import { useRecord } from "@/hooks/use-data";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { LineupOptionMode } from "@/lib/features/team/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { RiArrowLeftWideLine, RiUserFollowLine } from "react-icons/ri";

export const Substitutes = ({ recordId }: { recordId: string }) => {
  const dispatch = useAppDispatch();
  const { record } = useRecord(recordId);
  const { lineups, status } = useAppSelector((state) => state.lineup);
  const members = record.teams.home.players;

  return (
    <PanelContent>
      <PanelHeader>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 [&>svg]:size-5"
          onClick={() =>
            dispatch(lineupActions.setOptionMode(LineupOptionMode.NONE))
          }
        >
          <RiArrowLeftWideLine />
        </Button>
        <PanelTitle>替補名單</PanelTitle>
      </PanelHeader>
      {lineups[status.lineupIndex].substitutes.map((player, index) => {
        const member = members.find((m) => m._id === player._id);
        return (
          <Button
            key={member._id}
            variant="outline"
            size="wide"
            onClick={() =>
              dispatch(
                lineupActions.replaceEditingPlayer({
                  _id: member._id,
                  list: "substitutes",
                  zone: index + 1,
                }),
              )
            }
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
    </PanelContent>
  );
};
