import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Approach = {
  name: string;
  pros: string[];
  cons: string[];
};

type ApproachComparisonProps = {
  approaches: Approach[];
};

export function ApproachComparison({ approaches }: ApproachComparisonProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Approach</TableHead>
          <TableHead>Pros</TableHead>
          <TableHead>Cons</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {approaches.map((a) => (
          <TableRow key={a.name}>
            <TableCell className="font-medium">{a.name}</TableCell>
            <TableCell className="whitespace-normal">
              {a.pros.join(", ")}
            </TableCell>
            <TableCell className="whitespace-normal">
              {a.cons.join(", ")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
