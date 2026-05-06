import { Header } from "@/components/layout/header";
import Notifications from "@/components/notifications";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "通知" };

const NotificationsPage = () => {
  return (
    <>
      <Header title="通知" />
      <Notifications />
    </>
  );
};

export default NotificationsPage;
