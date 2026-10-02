import { CTASection } from "@/components/landing/cta-section";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { HeroEntryPrototype } from "@/components/landing/prototype-entry/hero-entry-prototype";
import { Highlights } from "@/components/landing/highlights";
import "@/styles/landing.css";

const LandingPage = () => {
  return (
    <main className="min-h-full w-full bg-background select-text">
      <Header />
      <Hero />
      <HeroEntryPrototype />
      <Highlights />
      <Features />
      <CTASection />
      <Footer />
    </main>
  );
};

export default LandingPage;
