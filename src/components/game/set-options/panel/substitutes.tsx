"use client";
import { PanelContent } from "@/components/custom/panel";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useGame } from "@/hooks/use-data";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { LineupOptionMode } from "@/lib/features/team/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { RiArrowLeftWideLine, RiUserFollowLine } from "react-icons/ri";

export const Substitutes = ({ gameId }: { gameId: string }) => {
  const dispatch = useAppDispatch();
  const { game } = useGame(gameId);
  const { lineups, status } = useAppSelector((state) => state.lineup);
  const members = game?.teams.home.players ?? [];

  return (
    <PanelContent>
      <Card className="size-full p-0">
        <CardHeader className="h-9 flex-row items-center justify-start">
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
          <CardTitle>替補名單</CardTitle>
        </CardHeader>
        {lineups[status.lineupIndex]?.substitutes.map((player, index) => {
          const member = members.find((m) => m.id === player.id);
          if (!member) return null;
          return (
            <Button
              key={member.id}
              variant="outline"
              size="wide"
              onClick={() =>
                dispatch(
                  lineupActions.replaceEditingPlayer({
                    id: member.id,
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
      </Card>
    </PanelContent>
  );
};
