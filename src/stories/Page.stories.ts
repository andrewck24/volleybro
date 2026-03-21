import type { Meta, StoryObj } from "@storybook/nextjs";
import { expect, userEvent, within } from "storybook/test";

import { Page } from "./Page";

const meta = {
  title: "Example/Page",
  component: Page,
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: "fullscreen",
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedOut: Story = {};

// More on component testing: https://storybook.js.org/docs/writing-tests/component-testing
export const LoggedIn: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Initial state: Renders login button", async () => {
      const loginButton = canvas.getByRole("button", { name: /Log in/i });
      await expect(loginButton).toBeInTheDocument();
    });

    await step("Action: User clicks login button", async () => {
      const loginButton = canvas.getByRole("button", { name: /Log in/i });
      await userEvent.click(loginButton);
    });

    await step("Final state: Renders logout button", async () => {
      const loginButton = canvas.queryByRole("button", { name: /Log in/i });
      await expect(loginButton).not.toBeInTheDocument();

      const logoutButton = canvas.getByRole("button", { name: /Log out/i });
      await expect(logoutButton).toBeInTheDocument();
    });
  },
};
