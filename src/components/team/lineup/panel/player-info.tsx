"use client";
import { PanelContent } from "@/components/custom/panel";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { LineupOptionMode } from "@/lib/features/team/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { BsGrid3X2Gap } from "react-icons/bs";
import {
  RiArrowLeftSLine,
  RiEditBoxLine,
  RiHashtag,
  RiRepeat2Line,
  RiUserLine,
} from "react-icons/ri";

export const PlayerInfo = ({
  players,
}: {
  players: { id: string; name: string; number?: number }[];
}) => {
  const dispatch = useAppDispatch();
  const { status, lineups } = useAppSelector((state) => state.lineup);
  const { lineupIndex, editingMember } = status;
  const activeList = (editingMember.list || "starting") as
    "starting" | "liberos" | "substitutes";
  const lineupPlayer =
    editingMember.zone != null
      ? lineups[lineupIndex]?.[activeList][editingMember.zone - 1]
      : undefined;
  const player = players.find((member) => member.id === editingMember.id);

  return (
    <PanelContent>
      <CardHeader className="w-full flex-row items-center justify-start">
        <Button
          variant="glass"
          size="icon"
          onClick={() =>
            dispatch(lineupActions.setOptionMode(LineupOptionMode.NONE))
          }
        >
          <RiArrowLeftSLine />
        </Button>
        <CardTitle>球員資訊</CardTitle>
        <Button
          variant="ghost"
          className="text-lg text-primary-text"
          onClick={() =>
            dispatch(lineupActions.setOptionMode(LineupOptionMode.SUBSTITUTES))
          }
        >
          <RiRepeat2Line />
          更換球員
        </Button>
      </CardHeader>
      <ItemGroup className="w-full">
        <Item className="text-xl">
          <ItemMedia className="[&_svg]:size-6">
            <RiHashtag />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="text-muted-foreground">背號</ItemTitle>
          </ItemContent>
          <ItemActions>{player?.number}</ItemActions>
        </Item>
        <Item className="text-xl">
          <ItemMedia className="[&_svg]:size-6">
            <RiUserLine />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="text-muted-foreground">姓名</ItemTitle>
          </ItemContent>
          <ItemActions>{player?.name}</ItemActions>
        </Item>
        <Item className="text-xl">
          <ItemMedia className="[&_svg]:size-6">
            <BsGrid3X2Gap />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="text-muted-foreground">位置</ItemTitle>
          </ItemContent>
          <ItemActions>
            {lineupPlayer?.position}
            <Button
              variant="ghost"
              size="icon"
              aria-label="編輯位置"
              onClick={() =>
                dispatch(
                  lineupActions.setOptionMode(LineupOptionMode.POSITIONS),
                )
              }
            >
              <RiEditBoxLine />
            </Button>
          </ItemActions>
        </Item>
      </ItemGroup>
      {/* TODO: Add data statistics table here  */}
    </PanelContent>
  );
};
