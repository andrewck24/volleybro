import Home from "@/components/home";
import { Header } from "@/components/layout/header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "首頁" };

const HomePage = () => {
  return (
    <>
      <Header className="font-medium text-primary" title="VolleyBro" />
      <Home />
    </>
  );
};

export default HomePage;
