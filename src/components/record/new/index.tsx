"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { useTeam, useTeamMembers } from "@/hooks/use-data";
import { RiArrowLeftWideLine, RiArrowRightLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBtnGroup,
} from "@/components/ui/card";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { MatchInfo } from "@/components/record/match";
import { MatchInfoForm } from "@/components/record/new/info-form";
import { RosterTable } from "@/components/record/new/roster-table";
import type { TMatchInfoForm } from "@/lib/features/record/types";

export const NewRecordForm = ({ teamId }: { teamId: string }) => {
  const router = useRouter();
  const [view, setView] = useState("");
  const { mutate } = useSWRConfig();
  const { team, isLoading: isTeamLoading } = useTeam(teamId);
  const { members, isLoading: isMembersLoading } = useTeamMembers(teamId);

  const [lineupIndex, setLineupIndex] = useState(0);
  const handleViewChange = (view: string) => {
    if (!document.startViewTransition) return setView(view);
    document.startViewTransition(() => setView(view));
  };

  const [info, setInfo] = useState<TMatchInfoForm>({
    name: "",
    number: 1,
    phase: "0",
    division: "0",
    category: "0",
    teams: {
      home: { name: team?.name },
      away: { name: "" },
    },
    scoring: { setCount: "3", decidingSetPoints: 15 },
    location: { city: "", hall: "" },
    time: { date: new Date(), start: "", end: "" },
    weather: { temperature: "" },
  });

  const getPlayerData = (list: string) => {
    if (!team || !members) return [];
    return team.lineups[lineupIndex][list].map((player) => {
      const member = members.find((member) => member._id === player._id);
      return {
        _id: member._id,
        name: member.name,
        number: member.number,
        list,
      };
    });
  };

  const players = useMemo(() => {
    const starting = getPlayerData("starting");
    const liberos = getPlayerData("liberos");
    const substitutes = getPlayerData("substitutes");
    return starting
      .concat(liberos, substitutes)
      .sort((a, b) => a.number - b.number);
  }, [team, members, lineupIndex, getPlayerData]);

  const createRecord = async () => {
    const infoData = {
      ...info,
      phase: Number(info.phase),
      division: Number(info.division),
      category: Number(info.category),
      scoring: {
        ...info.scoring,
        setCount: Number(info.scoring.setCount),
      },
    };

    try {
      const res = await fetch(`/api/records?ti=${teamId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          info: infoData,
          teams: {
            home: {
              _id: teamId,
              name: info.teams.home.name,
              players,
              lineup: team.lineups[lineupIndex],
            },
            away: { name: info.teams.away.name },
          },
        }),
      });

      const record = await res.json();
      if (record.error) throw new Error(record.error);
      mutate(`/api/records/${record._id}`, record, false);
      return router.push(`/record/${record._id}`);
    } catch (err) {
      console.log(err);
    }
  };

  if (isTeamLoading || isMembersLoading) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="h-5 w-25 rounded-md bg-muted animate-pulse" />
          <DialogDescription className="h-5 w-60 rounded-md bg-muted animate-pulse" />
        </DialogHeader>
      </>
    );
  }

  return (
    <>
      {!view ? (
        <div className="main-view w-full h-full flex flex-col gap-2 justify-center items-start bg-card">
          <DialogHeader>
            <DialogTitle>新增賽事紀錄</DialogTitle>
            <DialogDescription>
              編輯賽事基本資訊、確認陣容後點選「創建賽事紀錄」。
            </DialogDescription>
          </DialogHeader>
          <Card className="w-full overflow-y-auto shadow-none px-0">
            <CardHeader>
              <CardTitle className="text-lg leading-0">
                1. 編輯賽事資訊
              </CardTitle>
            </CardHeader>
            <MatchInfo info={info} onClick={() => handleViewChange("form")} />
            <CardHeader>
              <CardTitle className="text-lg leading-0 pt-2">
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
                      className="text-[1.25rem] w-8 h-8"
                    >
                      {index + 1}
                    </Button>
                  ))}
                </CardBtnGroup>
              </CardTitle>
            </CardHeader>
            <RosterTable roster={players} />
          </Card>
          <DialogFooter className="flex flex-col w-full">
            <DialogClose asChild>
              <Button size="lg" onClick={createRecord}>
                創建賽事紀錄
                <RiArrowRightLine />
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      ) : (
        <div className="sub-view w-full h-full flex flex-col gap-2 justify-center items-start bg-card">
          <DialogHeader>
            <DialogTitle>
              <Button
                variant="ghost"
                className="size-5 [&>svg]:size-5 p-0"
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
          <MatchInfoForm
            info={info}
            setInfo={setInfo}
            handleViewChange={handleViewChange}
          />
        </div>
      )}
    </>
  );
};
