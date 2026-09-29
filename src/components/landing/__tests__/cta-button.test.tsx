import { CTAButton } from "@/components/landing/cta-button";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import {
  ANDROID,
  LINUX,
  MAC,
  WINDOWS,
  iosUserAgent,
  setUserAgent,
} from "@test/support/dom/user-agent";

const firePrompt = (prompt: () => Promise<void>) => {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, {
    prompt,
    userChoice: Promise.resolve({ outcome: "accepted" }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
};

afterEach(() => {
  jest.restoreAllMocks();
  Object.defineProperty(window.navigator, "standalone", {
    configurable: true,
    value: undefined,
  });
});

describe("CTAButton", () => {
  describe.each([
    ["Windows", WINDOWS],
    ["macOS", MAC],
    ["Linux", LINUX],
    ["iOS older than 15", iosUserAgent(14)],
  ])("on %s", (_name, userAgent) => {
    it("links straight to the app", () => {
      setUserAgent(userAgent);

      render(<CTAButton />);

      expect(screen.getByRole("link", { name: "開始使用" })).toHaveAttribute(
        "href",
        "/home",
      );
    });
  });

  it("links straight to the app when already installed as a PWA", () => {
    setUserAgent(iosUserAgent(15));
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: true,
    });

    render(<CTAButton />);

    expect(screen.getByRole("link", { name: "開始使用" })).toHaveAttribute(
      "href",
      "/home",
    );
  });

  describe("on iOS 15+", () => {
    beforeEach(() => setUserAgent(iosUserAgent(15)));

    it("opens the add-to-home-screen instructions and closes them again", async () => {
      const user = userEvent.setup();
      render(<CTAButton />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "開始使用" }));

      const dialog = screen.getByRole("dialog", {
        name: "安裝此應用程式到主頁面",
      });
      expect(dialog).toHaveTextContent("點擊下方的分享");
      expect(dialog).toHaveTextContent("加入主畫面");

      await user.click(screen.getByRole("button", { name: "我知道了" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("on Android", () => {
    beforeEach(() => setUserAgent(ANDROID));

    it("shows nothing until the browser offers an install prompt", () => {
      render(<CTAButton />);

      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("offers install once the browser prompts, then hides the button after the prompt is used", async () => {
      const user = userEvent.setup();
      const prompt = jest.fn().mockResolvedValue(undefined);
      render(<CTAButton />);

      firePrompt(prompt);
      await user.click(
        await screen.findByRole("button", { name: "安裝應用程式" }),
      );

      expect(prompt).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByRole("button", { name: "安裝應用程式" }),
      ).not.toBeInTheDocument();
    });

    it("hides the install button and logs when the prompt fails", async () => {
      const user = userEvent.setup();
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const failure = new Error("Installation failed");
      render(<CTAButton />);

      firePrompt(jest.fn().mockRejectedValue(failure));
      await user.click(
        await screen.findByRole("button", { name: "安裝應用程式" }),
      );

      expect(consoleError).toHaveBeenCalledWith(
        "PWA installation failed:",
        failure,
      );
      expect(
        screen.queryByRole("button", { name: "安裝應用程式" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it.each([
      ["desktop", WINDOWS],
      ["iOS", iosUserAgent(15)],
    ])("has no violations on %s", async (_name, userAgent) => {
      setUserAgent(userAgent);

      const { container } = render(<CTAButton />);

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
