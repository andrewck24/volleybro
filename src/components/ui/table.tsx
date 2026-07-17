import * as React from "react";

import { cn } from "@/lib/utils";

const Table = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="relative w-full overflow-visible">
    <table
      data-slot="Table"
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
);

const TableHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead
    data-slot="TableHeader"
    className={cn("[&_tr]:border-b [&_tr]:border-muted", className)}
    {...props}
  />
);

const TableBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody
    data-slot="TableBody"
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
);

const TableFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tfoot
    data-slot="TableFooter"
    className={cn(
      "border-t bg-muted/50 font-medium last:[&>tr]:border-b-0",
      className,
    )}
    {...props}
  />
);

const TableRow = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    data-slot="TableRow"
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className,
    )}
    {...props}
  />
);

const TableHead = ({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    data-slot="TableHead"
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
);

const TableCell = ({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    data-slot="TableCell"
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
);

const TableCaption = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement>) => (
  <caption
    data-slot="TableCaption"
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
);

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
