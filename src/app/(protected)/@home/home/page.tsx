import { Header } from "@/components/layout/header";
import Home from "@/components/home";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "首頁" };

const HomePage = () => {
  return (
    <>
      <Header title="首頁" />
      <Home />
    </>
  );
};

export default HomePage;
