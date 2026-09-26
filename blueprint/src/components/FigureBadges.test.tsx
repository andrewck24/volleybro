import { render, screen } from "@testing-library/react";

import { FigureBadges } from "./FigureBadges";

describe("FigureBadges", () => {
  it("shows insertions and deletions as separate badges, named for screen readers", () => {
    render(
      <FigureBadges
        facts={{
          commits: 43,
          filesChanged: 422,
          insertions: 2893,
          deletions: 25197,
          srcFilesChanged: 4,
          scenarios: 8,
        }}
      />,
    );

    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      "43 commits",
      "422 files",
      "2893lines added",
      "25197lines removed",
      "4 src files",
      "8 scenarios",
    ]);
  });

  it("renders nothing when every figure is empty", () => {
    render(<FigureBadges facts={{ commits: 0, filesChanged: null }} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
