"use client";

import { useState } from "react";

interface Step {
  label: string;
  detail: string;
}

interface FeatureExplainerProps {
  title: string;
  summary: string;
  steps: Step[];
}

export function FeatureExplainer({ title, summary, steps }: FeatureExplainerProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div>
      <h2>{title}</h2>
      <p>{summary}</p>
      <ul>
        {steps.map((step, i) => (
          <li key={i}>
            <button onClick={() => setOpenIndex(openIndex === i ? null : i)}>
              {step.label}
            </button>
            {openIndex === i && <div>{step.detail}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
