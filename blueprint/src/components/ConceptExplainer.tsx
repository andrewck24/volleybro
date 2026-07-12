import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConceptExplainerProps {
  term: string;
  definition: string;
  example: string;
}

export function ConceptExplainer({
  term,
  definition,
  example,
}: ConceptExplainerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{term}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{definition}</p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-sm text-foreground">
          {example}
        </pre>
      </CardContent>
    </Card>
  );
}
