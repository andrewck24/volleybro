import { InviteAccordion } from "@/components/team/invite-accordion";
import { PlayerRole } from "@/entities/player";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock fetch
global.fetch = jest.fn();

describe("InviteAccordion", () => {
  const mockFetch = global.fetch as jest.Mock;
  const teamId = "team-123";

  beforeEach(() => {
    mockFetch.mockClear();
  });

  /**
   * T031 [US1] InviteAccordion 元件測試
   * 驗證邀請表單的基本功能
   */
  describe("基本渲染", () => {
    it("should render invitation form with email input and role select", () => {
      render(<InviteAccordion teamId={teamId} />);

      expect(screen.getByText("邀請成員")).toBeInTheDocument();
      expect(
        screen.getByText("輸入成員的電子郵件地址並選擇角色來邀請他們加入隊伍"),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("電子郵件")).toBeInTheDocument();
      expect(screen.getByText("角色")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "發送邀請" }),
      ).toBeInTheDocument();
    });

    it("should have send button disabled initially when email is empty", () => {
      render(<InviteAccordion teamId={teamId} />);

      const submitButton = screen.getByRole("button", { name: "發送邀請" });
      expect(submitButton).toBeDisabled();
    });
  });

  describe("表單互動", () => {
    it("should enable send button when email is filled", async () => {
      const user = userEvent.setup();
      render(<InviteAccordion teamId={teamId} />);

      const emailInput = screen.getByLabelText("電子郵件") as HTMLInputElement;
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: "發送邀請" });
      expect(submitButton).toBeEnabled();
    });

    it("should have role select component rendered", () => {
      render(<InviteAccordion teamId={teamId} />);

      // Verify the RoleSelect component is rendered (by checking for the label)
      expect(screen.getByText("角色")).toBeInTheDocument();
    });
  });

  describe("表單提交", () => {
    it("should successfully send invitation with valid email and role", async () => {
      const user = userEvent.setup();
      const onInviteSent = jest.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _id: "player-123",
          email: "invited@example.com",
          role: PlayerRole.MEMBER,
        }),
      });

      render(<InviteAccordion teamId={teamId} onInviteSent={onInviteSent} />);

      const emailInput = screen.getByLabelText("電子郵件") as HTMLInputElement;
      await user.type(emailInput, "invited@example.com");

      const submitButton = screen.getByRole("button", { name: "發送邀請" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/teams/${teamId}/players`,
          expect.objectContaining({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "invite",
              email: "invited@example.com",
              role: PlayerRole.MEMBER,
            }),
          }),
        );
      });

      await waitFor(() => {
        expect(onInviteSent).toHaveBeenCalled();
      });

      // Form should be reset
      expect(emailInput.value).toBe("");
    });

    it("should handle API error gracefully", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: "此電子郵件已被邀請",
        }),
      });

      render(<InviteAccordion teamId={teamId} />);

      const emailInput = screen.getByLabelText("電子郵件") as HTMLInputElement;
      await user.type(emailInput, "duplicate@example.com");

      const submitButton = screen.getByRole("button", { name: "發送邀請" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("此電子郵件已被邀請")).toBeInTheDocument();
      });
    });

    it("should show loading state while submitting", async () => {
      const user = userEvent.setup();

      let resolveSubmit: (() => void) | null = null;
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSubmit = () =>
              resolve({
                ok: true,
                json: async () => ({}),
              });
          }),
      );

      render(<InviteAccordion teamId={teamId} />);

      const emailInput = screen.getByLabelText("電子郵件") as HTMLInputElement;
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: "發送邀請" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "發送中..." }),
        ).toBeDisabled();
      });

      if (resolveSubmit) {
        resolveSubmit();
      }
    });
  });

  describe("isLoading prop", () => {
    it("should disable form when isLoading is true", () => {
      render(<InviteAccordion teamId={teamId} isLoading={true} />);

      const emailInput = screen.getByLabelText("電子郵件") as HTMLInputElement;
      const submitButton = screen.getByRole("button", { name: "發送邀請" });

      expect(emailInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });
});
