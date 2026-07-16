import { Link } from "@/components/ui/button";
import { DarkMode } from "@/components/landing/footer/dark-mode";

export const Footer = () => {
  return (
    <footer className="flex w-full flex-col items-start justify-center gap-2 bg-background px-4 pt-4 pb-8 md:px-[5%]">
      <div className="flex w-full flex-row flex-wrap items-start justify-center gap-2">
        <Section>
          <p className="text-lg font-medium text-foreground">
            Made with ❤️ by{" "}
            <Link
              href="https://www.linkedin.com/in/li-wei-tseng-andrew/"
              variant="link"
              className="p-0 text-lg"
            >
              Andrew Tseng
            </Link>
          </p>
        </Section>
      </div>
      <div className="flex w-full flex-row items-center justify-end gap-2">
        <p className="w-full text-lg font-medium text-foreground">
          © 2025 VolleyBro
        </p>
        <DarkMode />
      </div>
    </footer>
  );
};

const Section = ({ children }: { children?: React.ReactNode }) => {
  return (
    <section className="flex shrink-0 grow basis-50 flex-col items-start justify-start gap-2">
      {children}
    </section>
  );
};
