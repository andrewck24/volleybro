export function visibleShowcaseText(markup: string) {
  return markup
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/giu, " ")
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/giu, " ")
    .replace(/<br\s*\/?>/giu, " ")
    .replace(
      /<\/(?:address|article|blockquote|dd|div|dl|dt|figcaption|figure|h[1-6]|li|main|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)>/giu,
      " ",
    )
    .replace(/<[^>]*>/gu, " ")
    .replace(
      /&(?:#(?:x[\da-f]+|\d+)|amp|apos|gt|lt|nbsp|quot);/giu,
      decodeHtmlEntity,
    )
    .replace(/\s+/gu, " ")
    .trim();
}

function decodeHtmlEntity(entity: string) {
  const code = entity.slice(1, -1);
  if (code.startsWith("#x") || code.startsWith("#X")) {
    return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
  }
  if (code.startsWith("#")) {
    return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
  }

  return (
    {
      amp: "&",
      apos: "'",
      gt: ">",
      lt: "<",
      nbsp: " ",
      quot: '"',
    }[code] ?? entity
  );
}
