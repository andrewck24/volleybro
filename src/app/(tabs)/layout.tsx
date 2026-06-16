/*
 * modal mode: soft-navigation from within the tab context captures team edit routes
 * as Dialogs via intercepting routes in @modal/. Hard navigation bypasses interception
 * and falls through to (workspace) routes instead.
 */
import { TabContainer, type TabContainerProps } from "@/components/layout/tab-container";

const ProtectedLayout = (props: TabContainerProps) => {
  return <TabContainer {...props} />;
};

export default ProtectedLayout;
