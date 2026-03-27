"use client";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { PanelContent } from "@/components/ui/panel";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { LineupOptionMode } from "@/lib/features/team/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { BsGrid3X2Gap } from "react-icons/bs";
import {
  RiArrowLeftWideLine,
  RiEditBoxLine,
  RiHashtag,
  RiRepeat2Line,
  RiUserLine,
} from "react-icons/ri";

export const PlayerInfo = ({
  players,
}: {
  players: { _id: string; name: string; number?: number }[];
}) => {
  const dispatch = useAppDispatch();
  const { status, lineups } = useAppSelector((state) => state.lineup);
  const { lineupIndex, editingMember } = status;
  const activeList = (editingMember.list || "starting") as
    | "starting"
    | "liberos"
    | "substitutes";
  const lineupPlayer =
    editingMember.zone != null
      ? lineups[lineupIndex][activeList][editingMember.zone - 1]
      : undefined;
  const player = players.find((member) => member._id === editingMember._id);

  return (
    <PanelContent>
      <CardHeader className="h-9 w-full flex-row items-center justify-start">
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
        <CardTitle>球員資訊</CardTitle>
        <Button
          variant="ghost"
          className="h-7 text-lg text-primary [&>svg]:size-5"
          onClick={() =>
            dispatch(lineupActions.setOptionMode(LineupOptionMode.SUBSTITUTES))
          }
        >
          <RiRepeat2Line />
          更換球員
        </Button>
      </CardHeader>
      <Table>
        <TableBody className="text-xl">
          <TableRow>
            <TableCell>
              <RiHashtag />
            </TableCell>
            <TableCell className="w-16">背號</TableCell>
            <TableCell>{player?.number}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <RiUserLine />
            </TableCell>
            <TableCell>姓名</TableCell>
            <TableCell>{player?.name}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <BsGrid3X2Gap />
            </TableCell>
            <TableCell>位置</TableCell>
            <TableCell>{lineupPlayer?.position}</TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 [&>svg]:size-5"
                onClick={() =>
                  dispatch(
                    lineupActions.setOptionMode(LineupOptionMode.POSITIONS),
                  )
                }
              >
                <RiEditBoxLine />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {/* TODO: Add data statistics table here  */}
    </PanelContent>
  );
};
