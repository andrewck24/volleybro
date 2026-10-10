export type DiffMark = "add" | "remove";

export interface AnnotatedLine {
  text: string;
  mark?: DiffMark;
}

const MARKS: Record<string, DiffMark> = { "+": "add", "-": "remove" };
const NOTATION_MARK = /\/\/\s*\[!code\s+(\+\+|--)\]\s*$/u;

const looksUnified = (code: string) => {
  if (code.includes("[!code")) return false;
  const lines = code.split("\n").filter((line) => line !== "");
  return (
    lines.every((line) => /^[-+ ]/u.test(line)) &&
    lines.some((line) => /^[-+]/u.test(line))
  );
};

export function parseAnnotatedDiff(code: string, unified?: boolean) {
  const isUnified = unified ?? looksUnified(code);
  const lines: AnnotatedLine[] = code.split("\n").map((line) => {
    if (isUnified) {
      const mark = MARKS[line[0] ?? ""];
      return {
        text: mark ? ` ${line.slice(1)}` : line,
        mark,
      };
    }

    const notation = line.match(NOTATION_MARK);
    return {
      text: notation ? line.slice(0, notation.index).trimEnd() : line,
      mark: notation?.[1] === "++" ? "add" : notation ? "remove" : undefined,
    };
  });

  return { lines, code: lines.map(({ text }) => text).join("\n") };
}
