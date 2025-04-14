import { RiHashtag } from "react-icons/ri";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { TableRosterPlayer } from "@/lib/features/record/types";

const ListBadge = ({ list }: { list: string }) => {
  if (list === "substitutes") return null;

  return (
    <Badge variant={list === "starting" ? "default" : "destructive"}>
      {list === "starting" ? "先發" : "自由"}
    </Badge>
  );
};

export const RosterTable = ({ roster }: { roster: TableRosterPlayer[] }) => {
  return (
    <Table>
      <TableHeader className="text-lg">
        <TableRow>
          <TableHead className="w-10">
            <RiHashtag />
          </TableHead>
          <TableHead>姓名</TableHead>
          <TableHead className="w-16"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="text-xl">
        {roster.map((player) => (
          <TableRow key={player._id}>
            <TableCell>{player.number}</TableCell>
            <TableCell>{player.name}</TableCell>
            <TableCell>
              <ListBadge list={player.list} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
