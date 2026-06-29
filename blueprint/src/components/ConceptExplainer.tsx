interface ConceptExplainerProps {
  term: string;
  definition: string;
  example: string;
}

export function ConceptExplainer({ term, definition, example }: ConceptExplainerProps) {
  return (
    <div>
      <h3>{term}</h3>
      <p>{definition}</p>
      <pre>{example}</pre>
    </div>
  );
}
