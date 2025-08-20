import { Benefits } from "@/components/landing/benefits";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Highlights } from "@/components/landing/highlights";
import "@/styles/landing.css";

const LandingPage = () => {
  return (
    <main className="min-h-full w-full select-text">
      <Header />
      <Hero />
      <Highlights />
      <Benefits />
      <Footer />
    </main>
  );
};

export default LandingPage;
