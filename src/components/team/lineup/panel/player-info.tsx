"use client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PanelContent } from "@/components/ui/panel";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Player } from "@/entities/record";
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

export const PlayerInfo = ({ members }: { members: Player[] }) => {
  const dispatch = useAppDispatch();
  const { status, lineups } = useAppSelector((state) => state.lineup);
  const { lineupIndex, editingMember } = status;
  const player =
    lineups[lineupIndex][editingMember.list][editingMember.zone - 1];
  const member = members.find((member) => member._id === editingMember._id);

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
              <TableCell>{member?.number}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <RiUserLine />
              </TableCell>
              <TableCell>姓名</TableCell>
              <TableCell>{member?.name}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <BsGrid3X2Gap />
              </TableCell>
              <TableCell>位置</TableCell>
              <TableCell>{player?.position}</TableCell>
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
      </Card>
    </PanelContent>
  );
};
