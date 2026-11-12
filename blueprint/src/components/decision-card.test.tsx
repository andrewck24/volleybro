import { fireEvent, render, screen } from "@testing-library/react";

import { CardList } from "@/components/card-list";
import { DecisionCard } from "@/components/decision-card";
import { Accordion } from "@/components/ui/accordion";
import type { DecisionRecord } from "@/lib/decision-record";

const record = {
  schemaVersion: 2 as const,
  id: "0045",
  title: "People review at two gates",
  capabilities: ["platform/delivery-workflow"],
  decision: "Review happens at G1 and G2.",
  alternatives: [{ option: "Review every slice", reason: "Too many stops." }],
} satisfies DecisionRecord;

function renderCompact(card: DecisionRecord, supersededHref?: string) {
  return render(
    <CardList>
      <DecisionCard
        record={card}
        mode="compact"
        supersededHref={supersededHref}
      />
    </CardList>,
  );
}

function renderFull(card: DecisionRecord) {
  return render(
    <div className="not-prose relative my-6 pl-8 before:absolute before:inset-y-3 before:left-3 before:w-px before:bg-border">
      <Accordion type="multiple" defaultValue={[card.id]}>
        <DecisionCard record={card} mode="full" />
      </Accordion>
    </div>,
  );
}

describe("DecisionCard compact mode", () => {
  it("keeps the adr anchor id that hash links target", () => {
    const { container } = renderCompact(record);

    expect(container.innerHTML).toMatch(/ id="adr-0045"/);
  });

  it("shows only the number and title while collapsed", () => {
    renderCompact(record);

    expect(screen.getByText("ADR-0045")).toBeInTheDocument();
    expect(screen.getByText(record.title)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ADR-0045/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText(record.decision)).not.toBeInTheDocument();
  });

  it("shows the adopted decision and each rejected option when expanded", () => {
    renderCompact(record);
    fireEvent.click(screen.getByRole("button", { name: /ADR-0045/ }));

    expect(screen.getByText(record.decision)).toBeInTheDocument();
    expect(screen.getByText("採用")).toBeInTheDocument();
    expect(screen.getByText("Review every slice")).toBeInTheDocument();
    expect(screen.getByText("棄用")).toBeInTheDocument();
  });

  it("renders authored inline code as code when expanded", () => {
    const withInlineCode = {
      ...record,
      decision: "Run `pnpm blueprint build` before release.",
    };
    renderCompact(withInlineCode);
    fireEvent.click(screen.getByRole("button", { name: /ADR-0045/ }));

    expect(screen.getByText("pnpm blueprint build")).toHaveProperty(
      "tagName",
      "CODE",
    );
  });

  it("renders authored strong text when expanded", () => {
    const withStrongText = {
      ...record,
      decision: "Use **one shared renderer** across fields.",
    };
    renderCompact(withStrongText);
    fireEvent.click(screen.getByRole("button", { name: /ADR-0045/ }));

    expect(screen.getByText("one shared renderer")).toHaveProperty(
      "tagName",
      "STRONG",
    );
  });

  it("marks a superseded record and links to its replacement when expanded", () => {
    renderCompact(
      { ...record, supersededBy: "0061" },
      "/features/platform/delivery-workflow#adr-0061",
    );

    expect(screen.getByText("被 ADR-0061 取代")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /ADR-0045/ }));
    expect(
      screen.getByRole("link", { name: "查看取代它的 ADR-0061" }),
    ).toHaveAttribute("href", "/features/platform/delivery-workflow#adr-0061");
  });
});

const fullRecord = {
  schemaVersion: 2 as const,
  id: "0001",
  title: "Keep `DecisionRecord` canonical",
  capabilities: ["platform/delivery-workflow"],
  context: "Routes select records by `capabilities`.",
  decision: "Use `DecisionRecord` as the canonical input.",
  alternatives: [
    {
      option: "Make `Symphony` own delivery policy",
      reason: "It would couple durable workflow knowledge to the `runtime`.",
    },
  ],
  consequences: ["All fields stay available to `readers`."],
  revisitTriggers: ["A `repository` cannot express its delivery policy."],
  originChange: "full-rendering",
} satisfies DecisionRecord;

describe("DecisionCard full mode", () => {
  it("keeps the adr anchor id that hash links target", () => {
    const { container } = renderFull(fullRecord);

    expect(container.innerHTML).toMatch(/ id="adr-0001"/);
  });

  it("renders every record field in order and preserves inline code", () => {
    const { container } = renderFull(fullRecord);

    expect(screen.getByText("platform/delivery-workflow")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("heading", { level: 4 })
        .map((heading) => heading.textContent),
    ).toEqual([
      "Context",
      "Decision",
      "Alternatives not chosen",
      "Consequences",
      "Revisit triggers",
    ]);
    expect(
      screen.getAllByText("DecisionRecord").map((element) => element.tagName),
    ).toEqual(["CODE", "CODE"]);
    for (const value of [
      "capabilities",
      "Symphony",
      "runtime",
      "readers",
      "repository",
    ]) {
      expect(screen.getByText(value)).toHaveProperty("tagName", "CODE");
    }
    expect(container).toHaveTextContent("Keep DecisionRecord canonical");
    expect(container).toHaveTextContent(
      "Routes select records by capabilities.",
    );
    expect(container).toHaveTextContent(
      "Use DecisionRecord as the canonical input.",
    );
    expect(container).toHaveTextContent("Make Symphony own delivery policy");
    expect(container).toHaveTextContent(
      "It would couple durable workflow knowledge to the runtime.",
    );
    expect(container).toHaveTextContent(
      "All fields stay available to readers.",
    );
    expect(container).toHaveTextContent(
      "A repository cannot express its delivery policy.",
    );
    expect(
      screen.getByText("Origin Change: full-rendering"),
    ).toBeInTheDocument();
  });

  it("marks a superseded record", () => {
    renderFull({ ...fullRecord, supersededBy: "0045" });

    expect(screen.getByText("Superseded by 0045")).toBeInTheDocument();
  });

  it("renders authored strong text in full mode", () => {
    renderFull({
      ...fullRecord,
      decision: "Use **one canonical** input.",
    });

    expect(screen.getByText("one canonical")).toHaveProperty(
      "tagName",
      "STRONG",
    );
  });
});
