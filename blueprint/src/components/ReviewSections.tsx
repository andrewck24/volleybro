import type { ReactNode } from "react";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

// ADR-0073 fixes the order these appear in; the gate check enforces it.
export function ActionItems({ children }: { children: ReactNode }) {
  return <Section title="需要你決定／做的事">{children}</Section>;
}

export function ReviewFocus({ children }: { children: ReactNode }) {
  return <Section title="審查重點">{children}</Section>;
}

export function Deviations({ children }: { children: ReactNode }) {
  return <Section title="與 Proposal 的偏差">{children}</Section>;
}

export function AfterRelease({ children }: { children: ReactNode }) {
  return <Section title="上線後要做的事">{children}</Section>;
}

export function ReviewDetails({ children }: { children: ReactNode }) {
  return (
    <details className="my-6 rounded-xl border px-4 py-2">
      <summary className="cursor-pointer py-1 font-medium">
        驗證明細、finding 與殘留風險
      </summary>
      {children}
    </details>
  );
}
