import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import type { TableRosterPlayer } from "@/lib/features/game/types";

export const RosterList = ({ roster }: { roster: TableRosterPlayer[] }) => {
  return (
    <ItemGroup className="flex flex-col">
      {roster.map((player) => (
        <Item key={player.id}>
          <ItemContent>
            <ItemTitle className="h-5 text-base">{player.name}</ItemTitle>
            <ItemDescription className="h-5">
              {player.number != null && `#${player.number}`}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <ListBadge list={player.list} />
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
};

const ListBadge = ({ list }: { list: string }) => {
  if (list === "substitutes") return null;

  return (
    <Badge variant={list === "starting" ? "default" : "destructive"}>
      {list === "starting" ? "先發" : "自由"}
    </Badge>
  );
};
