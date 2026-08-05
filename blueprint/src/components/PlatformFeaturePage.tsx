import { DecisionTimeline } from "@/components/DecisionTimeline";

interface PlatformFeaturePageProps {
  title: string;
  summary: string;
  currentBehavior: string[];
  constraints: string[];
  decisions?: unknown[];
}

export function PlatformFeaturePage({
  title,
  summary,
  currentBehavior,
  constraints,
  decisions = [],
}: PlatformFeaturePageProps) {
  return (
    <div>
      <h1>{title}</h1>
      <p>{summary}</p>

      <h2>Current behavior</h2>
      <ul>
        {currentBehavior.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>Constraints</h2>
      <ul>
        {constraints.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {decisions.length > 0 && (
        <>
          <h2>Implemented decisions</h2>
          <DecisionTimeline decisions={decisions} />
        </>
      )}
    </div>
  );
}
