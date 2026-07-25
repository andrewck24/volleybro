"use client";
import { PanelContent } from "@/components/custom/panel";
import {
  LiberoReplaceDialog,
  LiberoReplaceTrigger,
} from "@/components/team/lineup/panel/options/libero-replace";
import { LineupError } from "@/components/team/lineup/panel/options/lineup-error";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { LineupOptionMode, type PlayerView } from "@/lib/features/team/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { Dialog } from "@radix-ui/react-dialog";
import { useState } from "react";
import { RiUserLine } from "react-icons/ri";

interface LineupOptionsProps {
  players: PlayerView[];
  others: PlayerView[];
  hasPairedSwitchPosition: boolean;
}

export const LineupOptions = ({
  players,
  others,
  hasPairedSwitchPosition,
}: LineupOptionsProps) => {
  const dispatch = useAppDispatch();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const { lineups, status } = useAppSelector((state) => state.lineup);
  const liberoCount = lineups[status.lineupIndex]?.liberos.length ?? 0;
  const substituteCount = lineups[status.lineupIndex]?.substitutes.length;
  const substituteLimit = liberoCount < 2 ? 6 - liberoCount : 6;
  const othersCount = others.length;

  const handlelineupIndexClick = (index: number) => {
    if (index === status.lineupIndex) return;
    if (hasPairedSwitchPosition) {
      dispatch(lineupActions.setLineupIndex(index));
    } else {
      setDialogOpen(true);
    }
  };

  return (
    <PanelContent>
      <CardHeader className="h-9 w-full flex-row items-center justify-start">
        <CardTitle>陣容配置 {status.lineupIndex + 1}</CardTitle>
        <div className="flex flex-1 flex-row items-center justify-end gap-2">
          {lineups.map((_, index) => (
            <Button
              key={index}
              variant={status.lineupIndex === index ? "default" : "outline"}
              size="icon"
              onClick={() => handlelineupIndexClick(index)}
              className="size-7 text-lg"
            >
              {index + 1}
            </Button>
          ))}
        </div>
      </CardHeader>
      <LineupError open={dialogOpen} setOpen={setDialogOpen} />
      <Dialog>
        <LiberoReplaceTrigger />
        <LiberoReplaceDialog />
      </Dialog>
      <Table>
        <TableHeader className="text-lg">
          <TableRow>
            <TableHead colSpan={3}>
              <div className="flex items-center justify-start">
                <span className="flex-1">
                  替補名單 ({substituteCount}/{substituteLimit})
                </span>
                <Button
                  variant="link"
                  size="lg"
                  className="w-fit px-0"
                  onClick={() =>
                    dispatch(
                      lineupActions.setOptionMode(LineupOptionMode.SUBSTITUTES),
                    )
                  }
                >
                  調整
                </Button>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-xl">
          {lineups[status.lineupIndex]?.substitutes &&
            lineups[status.lineupIndex]?.substitutes.map((lineupPlayer) => {
              const player = players?.find((p) => p.id === lineupPlayer.id);
              return (
                <TableRow key={player?.id}>
                  <TableCell className="w-6 [&>svg]:size-6">
                    <RiUserLine />
                  </TableCell>
                  <TableCell className="w-10 text-right">
                    {player?.number}
                  </TableCell>
                  <TableCell>{player?.name}</TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
      <Table>
        <TableHeader className="text-lg">
          <TableRow>
            <TableHead colSpan={3}>
              <div className="flex items-center justify-start">
                <span className="flex-1">未入選名單 ({othersCount})</span>
                <Button
                  variant="link"
                  size="lg"
                  className="w-fit px-0"
                  onClick={() =>
                    dispatch(
                      lineupActions.setOptionMode(LineupOptionMode.SUBSTITUTES),
                    )
                  }
                >
                  調整
                </Button>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-xl">
          {others &&
            others.map((player) => {
              return (
                <TableRow key={player.id}>
                  <TableCell className="w-6 [&>svg]:size-6">
                    <RiUserLine />
                  </TableCell>
                  <TableCell className="w-10 text-right">
                    {player?.number}
                  </TableCell>
                  <TableCell colSpan={2}>{player?.name}</TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </PanelContent>
  );
};

export default LineupOptions;
