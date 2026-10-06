import { LandingV2 } from "@/components/landing/prototype-v2";

// PROTOTYPE: served at `/?variant=v2` through a rewrite in src/proxy.ts. Its
// own route so `/` stays static and the landings never share first-load
// chunks. No landing.css: v2 carries its own world in prototype-v2/v2.css.
const LandingV2Page = () => <LandingV2 />;

export default LandingV2Page;
