import { CTASection } from "@/components/landing/cta-section";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";

// Mock Next.js Image component
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, className, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="cta-background-image"
      src={src}
      alt={alt}
      className={className}
      {...props}
    />
  ),
}));

// Mock motion/react
jest.mock("motion/react", () => ({
  motion: {
    section: ({
      children,
      className,
      initial,
      whileInView,
      transition,
      ...props
    }: any) => (
      <section className={className} {...props}>
        {children}
      </section>
    ),
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    h2: ({ children, className, ...props }: any) => (
      <h2 className={className} {...props}>
        {children}
      </h2>
    ),
    p: ({ children, className, ...props }: any) => (
      <p className={className} {...props}>
        {children}
      </p>
    ),
  },
}));

// Mock CTAButton component
jest.mock("@/components/landing/cta-button", () => ({
  CTAButton: ({ children, className, size, ...props }: any) => (
    <button
      data-testid="cta-section-button"
      className={className}
      data-size={size}
      {...props}
    >
      {children || "立即開始使用"}
    </button>
  ),
}));

describe("CTASection Component", () => {
  describe("Core Elements", () => {
    it("should render CTA section with core elements", () => {
      render(<CTASection />);

      expect(screen.getByTestId("cta-section")).toBeInTheDocument();
      expect(
        screen.getByText("準備好革新你的排球管理方式了嗎？"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("cta-section-button")).toBeInTheDocument();
    });

    it("should contain slogan, CTA button, and background image", () => {
      render(<CTASection />);

      const slogan = screen.getByText("準備好革新你的排球管理方式了嗎？");
      const button = screen.getByTestId("cta-section-button");
      const backgroundImage = screen.getByTestId("cta-background-image");

      expect(slogan).toBeInTheDocument();
      expect(button).toBeInTheDocument();
      expect(backgroundImage).toBeInTheDocument();
    });
  });

  describe("Layout and Design", () => {
    it("should use vertical layout for action focus", () => {
      render(<CTASection />);

      const container = screen.getByTestId("cta-content-container");
      expect(container).toHaveClass("flex", "flex-col", "items-center");
    });

    it("should have centered text alignment", () => {
      render(<CTASection />);

      const mainContainer = screen.getByTestId("cta-section");
      expect(mainContainer).toHaveClass("text-center");
    });

    it("should have appropriate vertical spacing between elements", () => {
      render(<CTASection />);

      const contentContainer = screen.getByTestId("cta-content-container");
      expect(contentContainer).toHaveClass("gap-12");
    });

    it("should render supporting text for better context", () => {
      render(<CTASection />);

      const supportingText = screen.getByText(/立即體驗 VolleyBro 的強大功能/);
      expect(supportingText).toBeInTheDocument();
      expect(supportingText).toHaveTextContent("讓數據驅動你的每一個戰術決策");
    });
  });

  describe("Hero Image Consistency", () => {
    it("should integrate Hero image consistently", () => {
      render(<CTASection />);

      const image = screen.getByTestId("cta-background-image");
      expect(image).toHaveAttribute("src", "/landing/hero.svg");
      expect(image).toHaveAttribute("alt", "VolleyBro App Interface");
    });
  });

  describe("CTA Button Integration", () => {
    it("should render CTAButton with unified design", () => {
      render(<CTASection />);

      const ctaButton = screen.getByTestId("cta-section-button");
      expect(ctaButton).toHaveAttribute("data-size", "lg");
      expect(ctaButton).toHaveClass("px-12", "py-4", "text-xl", "shadow-2xl");
    });

    it("should display correct CTA button text", () => {
      render(<CTASection />);

      const ctaButton = screen.getByTestId("cta-section-button");
      expect(ctaButton).toHaveTextContent("立即開始使用");
    });
  });

  describe("Visual Effects", () => {
    it("should render background decorations for visual appeal", () => {
      render(<CTASection />);

      const backgroundEffects = screen.getByTestId("cta-background-effects");
      expect(backgroundEffects).toBeInTheDocument();
      expect(backgroundEffects).toHaveClass("pointer-events-none");
    });

    it("should have floating animation elements", () => {
      render(<CTASection />);

      const floatingElements = screen.getAllByTestId(/cta-floating-/);
      expect(floatingElements.length).toBeGreaterThanOrEqual(2);

      expect(screen.getByTestId("cta-floating-1")).toBeInTheDocument();
      expect(screen.getByTestId("cta-floating-2")).toBeInTheDocument();
    });
  });

  describe("Section Layout and Styling", () => {
    it("should have correct section padding and structure", () => {
      render(<CTASection />);

      const section = screen.getByTestId("cta-section");
      expect(section).toHaveClass("relative", "mx-6", "lg:mx-12");
    });

    it("should have container with max-width constraint", () => {
      render(<CTASection />);

      const mainContainer = screen.getByTestId("cta-main-container");
      expect(mainContainer).toHaveClass("container", "mx-auto", "text-center");
    });
  });

  describe("Accessibility Requirements", () => {
    it("should have proper heading hierarchy", () => {
      render(<CTASection />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("準備好革新你的排球管理方式了嗎？");
    });

    it("should have accessible button", () => {
      render(<CTASection />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveAccessibleName("立即開始使用");
    });

    it("should have accessible image with alt text", () => {
      render(<CTASection />);

      const image = screen.getByRole("img");
      expect(image).toHaveAccessibleName("VolleyBro App Interface");
    });

    it("should have no accessibility violations", async () => {
      const { container } = render(<CTASection />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Responsive Design", () => {
    it("should have responsive text sizing", () => {
      render(<CTASection />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveClass("text-3xl", "md:text-4xl", "lg:text-5xl");
    });

    it("should have responsive button sizing", () => {
      render(<CTASection />);

      const button = screen.getByTestId("cta-section-button");
      expect(button).toHaveClass("px-12", "py-4", "text-xl");
    });
  });

  describe("Motion and Animation", () => {
    it("should render as motion.section", () => {
      render(<CTASection />);

      const section = screen.getByTestId("cta-section");
      expect(section).toBeInTheDocument();
    });
  });
});
