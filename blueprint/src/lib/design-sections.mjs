function headingText(node) {
  return node.value ?? node.children?.map(headingText).join("") ?? "";
}

export function designSections() {
  return (tree, file) => {
    const sourcePath = file.path?.replaceAll("\\", "/") ?? "";
    if (sourcePath !== "DESIGN.md" && !sourcePath.endsWith("/DESIGN.md"))
      return;

    const rewriteLinks = (node) => {
      if (node.type === "link" && typeof node.url === "string") {
        if (node.url.startsWith("blueprint/content/features/")) {
          node.url = node.url
            .replace("blueprint/content/features/", "/features/")
            .replace(/\/index\.mdx$/u, "");
        } else if (node.url.startsWith(".impeccable/")) {
          node.url = `https://github.com/andrewck24/volleybro/blob/main/${node.url}`;
        }
      }
      node.children?.forEach(rewriteLinks);
    };
    tree.children.forEach(rewriteLinks);

    const sections = [];
    let current;
    for (const node of tree.children) {
      if (node.type === "heading" && node.depth === 2) {
        current = [];
        sections.push(current);
      }
      current?.push(node);
    }

    tree.children = sections.flatMap((section) => {
      const first = section[0];
      if (!first) return [];
      const name = headingText(first);
      const escapedName = name
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;");
      return [
        {
          type: "html",
          value: `<section data-blueprint-design-section="${escapedName}">`,
        },
        ...section,
        { type: "html", value: "</section>" },
      ];
    });
  };
}
