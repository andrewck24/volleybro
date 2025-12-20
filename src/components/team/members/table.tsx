import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  RiUserLine,
  RiAdminLine,
  RiTimeLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
} from "react-icons/ri";
import { HiChevronUpDown } from "react-icons/hi2";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Player } from "@/entities/player";

interface DataTableProps<Player> {
  columns: ColumnDef<Player, any>[];
  data: Player[];
}

const DataTable = ({ columns, data }: DataTableProps<Player>) => {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
  });

  return (
    <Table className="text-lg">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              return (
                <TableHead
                  key={header.id}
                  style={{ width: `${header.getSize()}px` }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && "selected"}
              onClick={() =>
                router.push(
                  `/team/${row.original.teamId}/members/${row.original._id}`
                )
              }
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

const TeamMembersTable = ({ team, members, teamId }) => {
  const columns: ColumnDef<Player, any>[] = [
    {
      id: "image",
      header: () => <RiUserLine />,
      cell: () => <RiUserLine />,
      size: 32,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "number",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="lg"
            className="gap-0 [&>svg]:size-4"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            No.
            <HiChevronUpDown className="ml-2" />
          </Button>
        );
      },
      size: 52,
    },
    {
      accessorKey: "name",
      header: "姓名",
    },
    {
      id: "role",
      header: "狀態",
      cell: ({ row }) => {
        const memberId = row.original._id;
        const member = team.members.find((m) => m._id === memberId);
        const isAdmin = !!member.role;
        const identity: {
          text: string;
          type: "default" | "secondary" | "destructive" | "outline";
          icon: React.ReactNode;
        } = !member.email
          ? { text: "未邀請", type: "secondary", icon: <RiCloseCircleLine /> }
          : !member.user_id
          ? { text: "邀請中", type: "outline", icon: <RiTimeLine /> }
          : isAdmin
          ? { text: "管理者", type: "destructive", icon: <RiAdminLine /> }
          : { text: "已加入", type: "default", icon: <RiCheckboxCircleLine /> };

        return (
          <Badge variant={identity.type} className="[&>svg]:size-4">
            {identity.icon} {identity.text}
          </Badge>
        );
      },
      enableResizing: false,
      size: 96,
    },
  ];

  return <DataTable columns={columns} data={members} />;
};

export default TeamMembersTable;
