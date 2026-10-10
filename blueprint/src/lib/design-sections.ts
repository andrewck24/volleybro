interface Node {
  type: string;
  depth?: number;
  value?: string;
  children?: Node[];
}

const headingText = (node: Node): string =>
  node.value ?? node.children?.map(headingText).join("") ?? "";

// Keep one compiled root document; each route selects its authoritative sections.
export function designSections() {
  return (tree: { children: Node[] }) => {
    const sections: Node[] = [];
    let current: Node | undefined;
    for (const node of tree.children) {
      if (node.type === "heading" && node.depth === 2) {
        current = {
          type: "mdxJsxFlowElement",
          name: "DesignSection",
          attributes: [
            { type: "mdxJsxAttribute", name: "name", value: headingText(node) },
          ],
          children: [],
        } as Node;
        sections.push(current);
      }
      current?.children?.push(node);
    }
    tree.children = sections;
  };
}
