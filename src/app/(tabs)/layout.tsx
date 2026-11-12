import { StatusBarColor } from "@/components/layout/status-bar-color";
import {
  TabContainer,
  type TabContainerProps,
} from "@/components/layout/tab-container";

const ProtectedLayout = (props: TabContainerProps) => {
  return (
    <>
      <StatusBarColor color="var(--color-background)" />
      <TabContainer {...props} />
    </>
  );
};

export default ProtectedLayout;
