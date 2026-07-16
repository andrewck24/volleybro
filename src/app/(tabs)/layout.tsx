/*
 * modal mode: soft-navigation from within the tab context captures team edit routes
 * as Dialogs via intercepting routes in @modal/. Hard navigation bypasses interception
 * and falls through to (workspace) routes instead.
 */
import { BodyBackdrop } from "@/components/layout/body-backdrop";
import {
  TabContainer,
  type TabContainerProps,
} from "@/components/layout/tab-container";

const ProtectedLayout = (props: TabContainerProps) => {
  return (
    <>
      <BodyBackdrop color="var(--color-background)" />
      <TabContainer {...props} />
    </>
  );
};

export default ProtectedLayout;
