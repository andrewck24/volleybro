import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ERROR_MESSAGES } from "@/lib/api/error-messages";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { RiAlertLine } from "react-icons/ri";

const meta = {
  title: "Design System/Molecules/Confirmations",
  parameters: { layout: "fullscreen", chromatic: { viewports: [320, 390] } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ChosenDestructiveConfirmation = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: string;
}) => (
  <AlertDialog defaultOpen>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
      </AlertDialogHeader>
      <AlertDialogBody>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogBody>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <Button variant="secondary">{action}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const RemovePlayer: Story = {
  render: () => (
    <ChosenDestructiveConfirmation
      title="確定要將 陳大文 從名單中刪除嗎？"
      description="刪除後這名球員將從名單上移除，無法繼續使用隊伍相關功能。"
      action="確認刪除"
    />
  ),
};

export const TransferOwnership: Story = {
  render: () => (
    <ChosenDestructiveConfirmation
      title="確定要將隊伍所有權移轉給 陳大文 嗎？"
      description="移轉後 陳大文 將成為新擁有者，你仍保有管理員身分。"
      action="確認移轉"
    />
  ),
};

export const LeaveTeam: Story = {
  render: () => (
    <ChosenDestructiveConfirmation
      title="確定要離開這個隊伍嗎？"
      description="離開後將無法查看隊伍相關資訊與個人數據。此操作無法撤銷，若要重新加入需再次接受邀請。"
      action="確認離開"
    />
  ),
};

const UnconfirmedSet = ({ attempting }: { attempting: boolean }) => (
  <AlertDialog open>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {attempting ? "正在記錄本局結果…" : ERROR_MESSAGES.SERVER_ERROR.title}
        </AlertDialogTitle>
      </AlertDialogHeader>
      <AlertDialogBody className="flex-row items-center gap-2">
        {attempting ? (
          <Spinner role="status" aria-label="處理中" />
        ) : (
          <RiAlertLine className="size-5 shrink-0 text-error-text" />
        )}
        <AlertDialogDescription>
          {attempting
            ? "正在儲存本局結果，請稍候。"
            : "本局結果還沒存好，這一局的球都在，只差這一步。"}
        </AlertDialogDescription>
      </AlertDialogBody>
      {!attempting && (
        <AlertDialogFooter>
          <Button>重試</Button>
        </AlertDialogFooter>
      )}
    </AlertDialogContent>
  </AlertDialog>
);

export const UnconfirmedSetSaving: Story = {
  render: () => <UnconfirmedSet attempting />,
};

export const UnconfirmedSetExhausted: Story = {
  render: () => <UnconfirmedSet attempting={false} />,
};

export const UnconfirmedSetLeave: Story = {
  render: () => (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>本局結果還沒存好</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogBody>
          <AlertDialogDescription>
            現在離開，這一局的結果仍然沒有送出。回到這場比賽就能再試一次。
          </AlertDialogDescription>
        </AlertDialogBody>
        <AlertDialogFooter>
          <AlertDialogCancel>留在這裡</AlertDialogCancel>
          <AlertDialogAction variant="outline-destructive">
            仍要離開
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const LongActionLabel: Story = {
  render: () => (
    <ChosenDestructiveConfirmation
      title="確定要離開這個隊伍嗎？"
      description="標籤在可用寬度放不下一行時，按鈕改為上下排列，預設動作在上。"
      action="確認離開並移除我的個人數據"
    />
  ),
};

export const ThreeActions: Story = {
  render: () => (
    <AlertDialog defaultOpen>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>要儲存這份陣容嗎？</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogBody>
          <AlertDialogDescription>
            三個以上的按鈕一律上下排列，取消在最下方。
          </AlertDialogDescription>
        </AlertDialogBody>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <Button variant="secondary">不儲存</Button>
          <AlertDialogAction>儲存</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
