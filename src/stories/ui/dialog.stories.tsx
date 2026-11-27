import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { RiArrowLeftSLine, RiExpandDiagonalLine } from "react-icons/ri";

const meta = {
  title: "Design System/Molecules/Dialog",
  component: Dialog,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription srOnly>
            This is a visually hidden description for screen readers
          </DialogDescription>
        </DialogHeader>
        <DialogBody>This is the main content area of the dialog</DialogBody>
        <DialogFooter>
          <Button variant="secondary">Cancel</Button>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const LaterStep: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader
          leading={
            <Button type="button" variant="glass" size="icon">
              <RiArrowLeftSLine />
              <span className="sr-only">返回</span>
            </Button>
          }
        >
          <DialogTitle>Edit details</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>
            A later step of a multi-step dialog leads with back
          </DialogDescription>
        </DialogBody>
      </DialogContent>
    </Dialog>
  ),
};

export const TrailingControl: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent size="lg">
        <DialogHeader
          trailing={
            <Button
              type="button"
              variant="glass"
              size="icon"
              aria-label="全頁模式"
            >
              <RiExpandDiagonalLine />
            </Button>
          }
        >
          <DialogTitle>Edit team</DialogTitle>
          <DialogDescription srOnly>Edit team form</DialogDescription>
        </DialogHeader>
        <DialogBody>Form fields</DialogBody>
      </DialogContent>
    </Dialog>
  ),
};

export const LongContent: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Terms of Service for a title long enough to wrap
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="text-sm leading-relaxed">
          <DialogDescription>
            Please review the following terms
          </DialogDescription>
          {Array.from({ length: 10 }, (_, i) => (
            <p key={i} className="mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat.
            </p>
          ))}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary">Decline</Button>
          <Button>Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
