"use client";
import {
  LiberoReplaceDialog,
  LiberoReplaceTrigger,
} from "@/components/team/lineup/panels/options/libero-replace";
import { LineupError } from "@/components/team/lineup/panels/options/lineup-error";
import { Button } from "@/components/ui/button";
import { PanelContent, PanelHeader, PanelTitle } from "@/components/ui/panels";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { LineupOptionMode } from "@/lib/features/team/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { Dialog } from "@radix-ui/react-dialog";
import { useState } from "react";
import { RiUserLine } from "react-icons/ri";

export const LineupOptions = ({ members, others, hasPairedSwitchPosition }) => {
  const dispatch = useAppDispatch();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const { lineups, status } = useAppSelector((state) => state.lineup);
  const liberoCount = lineups[status.lineupIndex]?.liberos.length;
  const substituteCount = lineups[status.lineupIndex]?.substitutes.length;
  const substituteLimit = liberoCount < 2 ? 6 - liberoCount : 6;
  const othersCount = others.length;

  const handlelineupIndexClick = (index) => {
    if (index === status.lineupIndex) return;
    if (hasPairedSwitchPosition) {
      dispatch(lineupActions.setLineupIndex(index));
    } else {
      setDialogOpen(true);
    }
  };

  return (
    <PanelContent>
      <PanelHeader>
        <PanelTitle>陣容配置 {status.lineupIndex + 1}</PanelTitle>
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
      </PanelHeader>
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
            lineups[status.lineupIndex].substitutes.map((player) => {
              const member = members?.find((m) => m._id === player._id);
              return (
                <TableRow key={member._id}>
                  <TableCell className="w-6 [&>svg]:size-6">
                    <RiUserLine />
                  </TableCell>
                  <TableCell className="w-[2.5rem] text-right">
                    {member?.number}
                  </TableCell>
                  <TableCell>{member?.name}</TableCell>
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
            others.map((member) => {
              return (
                <TableRow key={member._id}>
                  <TableCell className="w-6 [&>svg]:size-6">
                    <RiUserLine />
                  </TableCell>
                  <TableCell className="w-[2.5rem] text-right">
                    {member?.number}
                  </TableCell>
                  <TableCell colSpan={2}>{member?.name}</TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </PanelContent>
  );
};

export default LineupOptions;
