import { http, HttpResponse } from "msw";
import { server } from "../../../test/support/msw/server";
import { render, screen } from "@testing-library/react";

import { ChangeHeader } from "./change-header";

describe("ChangeHeader", () => {
  it("refreshes static article status from the PR summary endpoint", async () => {
    server.use(
      http.get("*/api/change-summaries", () =>
        HttpResponse.json([
          {
            slug: "example",
            status: "merged",
            mergedAt: "2026-10-16T00:00:00Z",
          },
        ]),
      ),
    );
    render(
      <ChangeHeader
        slug="example"
        title="Example"
        status="in-progress"
        scenarioCount={2}
      />,
    );
    expect(screen.getByText("讀取 PR 狀態中…")).toBeInTheDocument();
    expect(await screen.findByText("已完成")).toBeInTheDocument();
    expect(screen.getByText("2026-10-16")).toBeInTheDocument();
  });

  it("does not present a baked PR status as current when the endpoint fails", async () => {
    server.use(http.get("*/api/change-summaries", () => HttpResponse.error()));
    render(
      <ChangeHeader
        slug="example"
        title="Example"
        status="merged"
        scenarioCount={0}
      />,
    );
    expect(await screen.findByText("暫時無法取得 PR 狀態")).toBeInTheDocument();
    expect(screen.queryByText("已完成")).not.toBeInTheDocument();
  });
  it("shows only the public in-progress status and derived figures", () => {
    render(
      <ChangeHeader
        title="Single Page Change"
        status="in-progress"
        scenarioCount={2}
        metrics={{
          commits: 2,
          filesChanged: 4,
          additions: 12,
          deletions: 3,
          srcFiles: 1,
        }}
      />,
    );

    expect(screen.getByText("進行中")).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Change figures" }),
    ).toHaveTextContent("2 commits");
    expect(
      screen.getByRole("list", { name: "Change figures" }),
    ).toHaveTextContent("2 scenarios");
    expect(screen.queryByText(/G1|G2|討論中/u)).not.toBeInTheDocument();
  });

  it("shows merged status and the verified completion date", () => {
    render(
      <ChangeHeader
        title="Merged Change"
        status="merged"
        mergedAt="2026-10-12T08:30:00.000Z"
        scenarioCount={0}
      />,
    );

    expect(screen.getByText("已完成")).toBeInTheDocument();
    expect(screen.getByText("2026-10-12")).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Change figures" }),
    ).not.toBeInTheDocument();
  });
});
