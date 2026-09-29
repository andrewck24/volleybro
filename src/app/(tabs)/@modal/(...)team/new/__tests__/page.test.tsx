import { useTeam } from "@/hooks/use-data";
import { SwrIsolation } from "@/test-utils/swr-isolation";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "../../../../../../../test/msw/server";
import NewTeamModalPage from "../page";

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const TeamName = () => {
  const { team } = useTeam(VALID_OBJECT_ID);
  return <p>{team?.name}</p>;
};

const Tree = ({ showTeam = false }: { showTeam?: boolean }) => (
  <SwrIsolation>
    <NewTeamModalPage />
    {showTeam && <TeamName />}
  </SwrIsolation>
);

beforeEach(() => {
  mockReplace.mockClear();
  sessionStorage.clear();
});

async function fillAndSubmit() {
  const nameField = await screen.findByPlaceholderText("日本國家男子排球隊");
  await userEvent.type(nameField, "My Team");
  await userEvent.click(screen.getByRole("button", { name: /建立隊伍/i }));
}

describe("NewTeamModalPage", () => {
  it("shows a root error and stays open when creation fails", async () => {
    server.use(
      http.post("/api/teams", () =>
        HttpResponse.json(
          { code: "UNEXPECTED", reason: "UNHANDLED_ERROR" },
          { status: 500 },
        ),
      ),
    );
    render(<Tree />);

    await fillAndSubmit();

    expect(
      await screen.findByText("伺服器暫時無法處理你的請求，請稍後再試一次"),
    ).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("creates the team, opens its page and has the team ready without refetching", async () => {
    let postBody: unknown;
    server.use(
      http.post("/api/teams", async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({
          id: VALID_OBJECT_ID,
          name: "My Team",
          nickname: "",
        });
      }),
    );
    const { rerender } = render(<Tree />);

    await fillAndSubmit();

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        `/team/${VALID_OBJECT_ID}?tab=about`,
      ),
    );
    expect(postBody).toEqual({ name: "My Team", nickname: "" });

    // No GET handler is registered: a refetch would fail the test.
    rerender(<Tree showTeam />);
    expect(screen.getByText("My Team")).toBeInTheDocument();
  });
});
