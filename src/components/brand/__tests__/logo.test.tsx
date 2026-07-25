import {
  LogoSymbol,
  V_ARM_LEFT,
  V_ARM_RIGHT,
  V_VIEWBOX,
  V_CORAL,
  V_IVORY,
} from "@/components/brand/logo-symbol";
import {
  LogoType,
  TYPE_ARM_LEFT,
  TYPE_ARM_RIGHT,
  TYPE_LETTERS,
  TYPE_LETTERS_SHIFT,
  TYPE_VIEWBOX,
} from "@/components/brand/logo-type";
import { collect, type SvgLikeElement } from "@/test-utils/svg-tree";

describe("LogoSymbol", () => {
  it("renders the two v-arm paths in the exported viewBox", () => {
    const elem = LogoSymbol({});
    const svg = collect(elem, "svg")[0]!;
    const paths = collect(elem, "path");

    expect(svg.props.viewBox).toBe(V_VIEWBOX);
    expect(paths).toHaveLength(2);
    expect(paths[0]!.props.d).toBe(V_ARM_LEFT);
    expect(paths[1]!.props.d).toBe(V_ARM_RIGHT);
  });

  it("adaptive variant fills the left arm with currentColor, right arm always coral", () => {
    const paths = collect(LogoSymbol({ variant: "adaptive" }), "path");

    expect(paths[0]!.props.fill).toBe("currentColor");
    expect(paths[1]!.props.fill).toBe(V_CORAL);
  });

  it("brand variant fills the left arm ivory, right arm always coral", () => {
    const paths = collect(LogoSymbol({ variant: "brand" }), "path");

    expect(paths[0]!.props.fill).toBe(V_IVORY);
    expect(paths[1]!.props.fill).toBe(V_CORAL);
  });
});

describe("LogoType", () => {
  it("renders the two v-arm paths plus 8 letter paths inside a translated group", () => {
    const elem = LogoType({});
    const svg = collect(elem, "svg")[0]!;
    const group = collect(elem, "g")[0]!;
    const armPaths = svg.props.children as SvgLikeElement[];
    const letterPaths = collect(group, "path");

    expect(svg.props.viewBox).toBe(TYPE_VIEWBOX);
    expect(group.props.transform).toBe(`translate(${TYPE_LETTERS_SHIFT} 0)`);
    expect(armPaths[0]!.props.d).toBe(TYPE_ARM_LEFT);
    expect(armPaths[1]!.props.d).toBe(TYPE_ARM_RIGHT);
    expect(letterPaths).toHaveLength(TYPE_LETTERS.length);
    expect(TYPE_LETTERS).toHaveLength(8);
  });
});
