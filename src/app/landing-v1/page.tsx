import { LandingV1 } from "@/components/landing/prototype-v1";
import "@/styles/landing.css";

// PROTOTYPE: served at `/?variant=v1` through a rewrite in src/proxy.ts. Its
// own route (not a branch inside app/page.tsx) so `/` stays static and the two
// landings never share first-load chunks.
const LandingV1Page = () => <LandingV1 />;

export default LandingV1Page;
