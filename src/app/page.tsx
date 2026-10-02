import { CTASection } from "@/components/landing/cta-section";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Highlights } from "@/components/landing/highlights";
import "@/styles/landing.css";
// PROTOTYPE (throwaway): section-3 scroll mechanics, mounted on the public landing route
import PrototypeScrollSteps from "@/app/prototype-scroll-steps/page";

const LandingPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) => {
  const { variant } = await searchParams;
  if (variant && ["A1", "A2", "B1", "B2"].includes(variant)) {
    return <PrototypeScrollSteps searchParams={searchParams} />;
  }
  return (
    <main className="min-h-full w-full bg-background select-text">
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
