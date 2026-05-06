import { Header } from "@/components/layout/header";
import User from "@/components/user";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "設定" };

const UserPage = () => {
  return (
    <>
      <Header title="設定" />
      <User />
    </>
  );
};

export default UserPage;
