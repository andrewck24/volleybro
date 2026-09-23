/*
 * modal mode: soft-navigation from within the tab context captures team edit routes
 * as Dialogs via intercepting routes in @modal/. Hard navigation bypasses interception
 * and falls through to (workspace) routes instead.
 */
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
