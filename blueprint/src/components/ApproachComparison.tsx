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
    <table>
      <thead>
        <tr>
          <th>Approach</th>
          <th>Pros</th>
          <th>Cons</th>
        </tr>
      </thead>
      <tbody>
        {approaches.map((a) => (
          <tr key={a.name}>
            <td>{a.name}</td>
            <td>{a.pros.join(", ")}</td>
            <td>{a.cons.join(", ")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
