"use client";
import { PanelContent } from "@/components/custom/panel";
import {
  LiberoReplaceDialog,
  LiberoReplaceTrigger,
} from "@/components/team/lineup/panel/options/libero-replace";
import { LineupError } from "@/components/team/lineup/panel/options/lineup-error";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  Item,
  ItemAvatar,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  SegmentedPicker,
  SegmentedPickerItem,
} from "@/components/ui/segmented-picker";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { LineupOptionMode, type PlayerView } from "@/lib/features/team/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
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
  const [liberoDialogOpen, setLiberoDialogOpen] = useState(false);
  const { lineups, status } = useAppSelector((state) => state.lineup);
  const liberoCount = lineups[status.lineupIndex]?.liberos.length ?? 0;
  const substituteCount = lineups[status.lineupIndex]?.substitutes.length ?? 0;
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
      <CardHeader className="w-full flex-row flex-wrap items-center justify-start">
        <CardTitle className="w-auto">
          陣容配置 {status.lineupIndex + 1}
        </CardTitle>
        <div className="flex flex-1 flex-row items-center justify-end">
          <SegmentedPicker
            label="陣容配置"
            value={String(status.lineupIndex)}
            onValueChange={(v) => handlelineupIndexClick(Number(v))}
          >
            {lineups.map((_, index) => (
              <SegmentedPickerItem key={index} value={String(index)}>
                {index + 1}
              </SegmentedPickerItem>
            ))}
          </SegmentedPicker>
        </div>
      </CardHeader>
      <LineupError open={dialogOpen} setOpen={setDialogOpen} />
      <Dialog open={liberoDialogOpen} onOpenChange={setLiberoDialogOpen}>
        <LiberoReplaceTrigger />
        <LiberoReplaceDialog onSuccess={() => setLiberoDialogOpen(false)} />
      </Dialog>
      <div className="flex h-10 w-full items-center px-2 text-lg font-medium text-muted-foreground">
        <span className="flex-1">
          替補名單 ({substituteCount}/{substituteLimit})
        </span>
        <Button
          variant="link"
          className="w-fit px-0"
          onClick={() =>
            dispatch(lineupActions.setOptionMode(LineupOptionMode.SUBSTITUTES))
          }
        >
          調整
        </Button>
      </div>
      <ItemGroup className="w-full">
        {lineups[status.lineupIndex]?.substitutes &&
          lineups[status.lineupIndex]?.substitutes.map((lineupPlayer) => {
            const player = players?.find((p) => p.id === lineupPlayer.id);
            return (
              <Item key={player?.id ?? lineupPlayer.id}>
                <ItemMedia variant="image">
                  <ItemAvatar alt={player?.name} fallback={<RiUserLine />} />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="h-6">{player?.name}</ItemTitle>
                  <ItemDescription className="h-6">
                    {player?.number != null && `#${player.number}`}
                  </ItemDescription>
                </ItemContent>
              </Item>
            );
          })}
      </ItemGroup>
      <div className="flex h-10 w-full items-center px-2 text-lg font-medium text-muted-foreground">
        <span className="flex-1">未入選名單 ({othersCount})</span>
        <Button
          variant="link"
          className="w-fit px-0"
          onClick={() =>
            dispatch(lineupActions.setOptionMode(LineupOptionMode.SUBSTITUTES))
          }
        >
          調整
        </Button>
      </div>
      <ItemGroup className="w-full">
        {others &&
          others.map((player) => (
            <Item key={player.id}>
              <ItemMedia variant="image">
                <ItemAvatar alt={player?.name} fallback={<RiUserLine />} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="h-6">{player?.name}</ItemTitle>
                <ItemDescription className="h-6">
                  {player?.number != null && `#${player.number}`}
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
      </ItemGroup>
    </PanelContent>
  );
};

export default LineupOptions;
