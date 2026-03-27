import { Badge } from "@/components/ui/badge";
import { Item, ItemActions } from "@/components/ui/item";
import { PersonItem } from "@/components/custom/person-item";
import type { TableRosterPlayer } from "@/lib/features/record/types";

export const RosterList = ({ roster }: { roster: TableRosterPlayer[] }) => {
  return (
    <div className="flex flex-col">
      {roster.map((player) => (
        <Item key={player._id}>
          <PersonItem name={player.name}>
            {player.number != null && (
              <span className="shrink-0 text-sm text-muted-foreground">
                #{player.number}
              </span>
            )}
          </PersonItem>
          <ItemActions>
            <ListBadge list={player.list} />
          </ItemActions>
        </Item>
      ))}
    </div>
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
