import { MockupFrame } from "./MockupFrame";
import LogoRedesign from "../../content/changes/logo-v-splash-redesign/design";
import {
  // @ts-expect-error injected by retainedDesignExports
  RetainedElevationLabA,
  // @ts-expect-error injected by retainedDesignExports
  RetainedElevationLabB,
} from "../../content/changes/elevation-depth-system/design";
import {
  // @ts-expect-error injected by retainedDesignExports
  RetainedConflictSimulator,
} from "../../content/changes/sync-recording/design";

const RETAINED_MOCKUPS = {
  "elevation-lab-a": RetainedElevationLabA,
  "elevation-lab-b": RetainedElevationLabB,
  "logo-redesign": LogoRedesign,
  "sync-conflict-simulator": RetainedConflictSimulator,
};

type RetainedMockupName = keyof typeof RETAINED_MOCKUPS;

export function RetainedMockupIsland({ name }: { name: RetainedMockupName }) {
  return <MockupFrame Mockup={RETAINED_MOCKUPS[name]} />;
}
