"use client";
import { MatchInfo } from "@/components/game/match";
import { MatchInfoForm } from "@/components/game/new/info-form";
import {
  newGameBody,
  newGameFormDefaults,
} from "@/lib/features/game/new-game-form";
import { PlayersList } from "@/components/game/new/players-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBtnGroup,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useTeam, useTeamPlayers } from "@/hooks/use-data";
import { apiClient } from "@/lib/api/api-client";
import { showErrorToast } from "@/lib/api/error-toast";
import type {
  LineupListPlayer,
  TMatchInfoForm,
} from "@/lib/features/game/types";
import type { LineupList } from "@/lib/features/team/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiArrowLeftWideLine, RiArrowRightLine } from "react-icons/ri";
import { useSWRConfig } from "swr";

export const NewGameForm = ({ teamId }: { teamId: string }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [view, setView] = useState("");
  const { mutate } = useSWRConfig();
  const { team, isLoading: isTeamLoading } = useTeam(teamId);
  const { players: teamPlayers, isLoading: isPlayersLoading } =
    useTeamPlayers(teamId);

  const [lineupIndex, setLineupIndex] = useState(0);
  const handleViewChange = (view: string) => {
    if (!document.startViewTransition) return setView(view);
    document.startViewTransition(() => setView(view));
  };

  const [info, setInfo] = useState<TMatchInfoForm>(
    newGameFormDefaults(team?.name),
  );

  const getPlayerData = (list: LineupList): LineupListPlayer[] => {
    if (!team || !teamPlayers) return [];
    const lineup = team.lineups[lineupIndex];
    if (!lineup) return [];
    return (lineup[list] as { id: string }[]).map((player) => {
      const member = teamPlayers.find((p) => p.id === player.id);
      return {
        id: member?.id ?? "",
        name: member?.name ?? "",
        number: member?.number ?? 0,
        list,
      };
    });
  };

  const players = getPlayerData("starting")
    .concat(getPlayerData("liberos"), getPlayerData("substitutes"))
    .filter((player) => player.id)
    .sort((a, b) => a.number - b.number);

  const [isCreating, setIsCreating] = useState(false);

  const createGame = async () => {
    setIsCreating(true);
    try {
      const game = await apiClient<{ id: string }>(`/api/games?ti=${teamId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          newGameBody({
            info,
            teamId,
            players,
            lineup: team?.lineups[lineupIndex],
          }),
        ),
      });

      mutate(`/api/games/${game.id}`, game, false);
      return router.push(`/game/${game.id}`);
    } catch (err) {
      showErrorToast(err, toast);
    } finally {
      setIsCreating(false);
    }
  };

  if (isTeamLoading || isPlayersLoading) {
    return (
      <DialogHeader>
        <DialogTitle className="h-5 w-25 animate-pulse rounded-md bg-muted" />
        <DialogDescription className="h-5 w-60 animate-pulse rounded-md bg-muted" />
      </DialogHeader>
    );
  }

  return (
    <>
      {!view ? (
        <>
          <DialogHeader>
            <DialogTitle>新增賽事紀錄</DialogTitle>
            <DialogDescription>
              編輯賽事基本資訊、確認陣容後點選「創建賽事紀錄」。
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-lg leading-0">
                  1. 編輯賽事資訊
                </CardTitle>
              </CardHeader>
              <MatchInfo info={info} onClick={() => handleViewChange("form")} />
              <CardHeader>
                <CardTitle className="pt-2 text-lg leading-0">
                  2. 確認出賽名單
                </CardTitle>
              </CardHeader>
              <CardHeader>
                <CardTitle>
                  陣容配置 {lineupIndex + 1}
                  <CardBtnGroup>
                    {team?.lineups.map((_, index) => (
                      <Button
                        key={index}
                        variant={lineupIndex === index ? "default" : "outline"}
                        size="icon"
                        onClick={() => setLineupIndex(index)}
                        className="h-8 w-8 text-[1.25rem]"
                      >
                        {index + 1}
                      </Button>
                    ))}
                  </CardBtnGroup>
                </CardTitle>
              </CardHeader>
              <PlayersList players={players} />
            </Card>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                size="lg"
                onClick={createGame}
                loading={isCreating}
                loadingText="建立中"
              >
                創建賽事紀錄
                <RiArrowRightLine />
              </Button>
            </DialogClose>
          </DialogFooter>
        </>
      ) : (
        <>
          <DialogHeader>
            <DialogTitle>
              <Button
                variant="ghost"
                className="size-5 p-0 [&>svg]:size-5"
                onClick={() => handleViewChange("")}
              >
                <RiArrowLeftWideLine />
              </Button>
              編輯賽事資訊
            </DialogTitle>
            <DialogDescription>
              輸入賽事、隊伍等資訊，稍後仍可以在「賽事紀錄頁面」中修改。
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <MatchInfoForm
              info={info}
              setInfo={setInfo}
              handleViewChange={handleViewChange}
            />
          </DialogBody>
        </>
      )}
    </>
  );
};
