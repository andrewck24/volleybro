"use client";

import { Fragment, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Step {
  label: string;
  detail: string;
}

interface FeatureExplainerProps {
  title: string;
  summary: string;
  steps: Step[];
}

export function FeatureExplainer({
  title,
  summary,
  steps,
}: FeatureExplainerProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{summary}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col">
        {steps.map((step, i) => (
          <Fragment key={i}>
            {i > 0 && <Separator />}
            <button
              type="button"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center py-2 text-left font-medium transition-colors hover:text-primary"
            >
              {step.label}
            </button>
            {openIndex === i && (
              <div className="pb-2 text-sm text-muted-foreground">
                {step.detail}
              </div>
            )}
          </Fragment>
        ))}
      </CardContent>
    </Card>
  );
}
