import { CTASection } from "@/components/landing/cta-section";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Highlights } from "@/components/landing/highlights";
import "@/styles/landing.css";

const LandingPage = () => {
  return (
    <main className="min-h-full w-full select-text bg-background">
      <Header />
      <Hero />
      <Highlights />
      <Features />
      <CTASection />
      <Footer />
    </main>
  );
};

export default LandingPage;
