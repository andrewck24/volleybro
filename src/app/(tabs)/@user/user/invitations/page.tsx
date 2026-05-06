import { Header } from "@/components/layout/header";
import { Invitations } from "@/components/user/invitations";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "邀請" };

const InvitationsPage = () => {
  return (
    <>
      <Header title="邀請" backHref="/user" />
      <Invitations className="w-full" />
    </>
  );
};

export default InvitationsPage;
