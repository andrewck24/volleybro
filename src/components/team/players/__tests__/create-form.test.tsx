import { CreateForm } from "@/components/team/players/create-form";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@test/support/msw/server";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const TEAM_ID = "507f1f77bcf86cd799439011";

let submittedBodies: Record<string, unknown>[];

// jsdom does not implement scrollIntoView, which Radix Select calls on open.
Element.prototype.scrollIntoView = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  submittedBodies = [];
  server.use(
    http.post(`/api/teams/${TEAM_ID}/players`, async ({ request }) => {
      submittedBodies.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json({ id: "player-1" });
    }),
  );
});

// Pasted, not typed: a render per keystroke can outlast Jest's timeout under load.
async function fill(field: HTMLElement, text: string) {
  await userEvent.click(field);
  await userEvent.paste(text);
}

async function setup({ email }: { email?: string } = {}) {
  render(
    <SwrIsolation>
      <CreateForm teamId={TEAM_ID} />
    </SwrIsolation>,
  );
  const nameField = await screen.findByPlaceholderText("輸入姓名");
  await fill(nameField, "New Player");
  if (email) {
    await fill(screen.getByPlaceholderText("user@example.com"), email);
  }
  await userEvent.click(screen.getByRole("button", { name: /新增球員/ }));
}

describe("CreateForm", () => {
  it("replaces with the new player's page on success", async () => {
    await setup();

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        `/team/${TEAM_ID}/players/player-1`,
      ),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("offers the role field only once an email makes it an invitation", async () => {
    render(
      <SwrIsolation>
        <CreateForm teamId={TEAM_ID} />
      </SwrIsolation>,
    );

    await screen.findByPlaceholderText("輸入姓名");
    expect(screen.queryByText("角色")).not.toBeInTheDocument();

    await fill(
      screen.getByPlaceholderText("user@example.com"),
      "invitee@example.com",
    );

    expect(await screen.findByText("角色")).toBeInTheDocument();
  });

  it("submits no role when no email was filled in", async () => {
    await setup();

    await waitFor(() => expect(submittedBodies).toHaveLength(1));
    expect(submittedBodies[0]).not.toHaveProperty("role");
  });

  it("submits no role when the email is cleared again", async () => {
    render(
      <SwrIsolation>
        <CreateForm teamId={TEAM_ID} />
      </SwrIsolation>,
    );

    const nameField = await screen.findByPlaceholderText("輸入姓名");
    await fill(nameField, "New Player");
    const emailField = screen.getByPlaceholderText("user@example.com");
    await fill(emailField, "invitee@example.com");
    await screen.findByText("角色");
    await userEvent.click(screen.getByRole("combobox", { name: "角色" }));
    await userEvent.click(
      await screen.findByRole("option", { name: "管理員" }),
    );
    await userEvent.clear(emailField);
    expect(screen.queryByText("角色")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /新增球員/ }));

    await waitFor(() => expect(submittedBodies).toHaveLength(1));
    expect(submittedBodies[0]).not.toHaveProperty("role");
  });
});
