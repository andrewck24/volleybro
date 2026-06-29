import React from "react";

type VerdictStatus = "pass" | "fail" | "partial";

const config: Record<VerdictStatus, { icon: string; label: string }> = {
  pass: { icon: "✅", label: "Pass" },
  fail: { icon: "❌", label: "Fail" },
  partial: { icon: "⚠️", label: "Partial" },
};

export function Verdict({ status }: { status: VerdictStatus }) {
  const { icon, label } = config[status];
  return (
    <span>
      <span aria-hidden="true">{icon}</span> {label}
    </span>
  );
}
