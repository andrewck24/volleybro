import { CTASection } from "@/components/landing/cta-section";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Highlights } from "@/components/landing/highlights";
import {
  LandingVariant,
  isLandingVariant,
} from "@/components/landing/prototype-visual";
import "@/styles/landing.css";

const LandingPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string; cta?: string }>;
}) => {
  const { variant, cta } = await searchParams;
  if (isLandingVariant(variant))
    return <LandingVariant variant={variant} cta={cta} />;

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
