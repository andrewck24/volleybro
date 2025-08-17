import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Benefits } from "@/components/landing/benefits";
import { Footer } from "@/components/landing/footer";

const LandingPage = () => {
  return (
    <main className="w-full min-h-full bg-primary select-text">
      <Hero />
      <Features />
      <Benefits />
      <Footer />
    </main>
  );
};

export default LandingPage;
