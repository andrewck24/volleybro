// Git's own definition of a trailer block: the last paragraph of the
// message body, where every line is either `Token: value` or a
// continuation (indented) line attached to the trailer above it. A
// naive `message.includes("Blueprint-Change:")` would also match the
// string appearing in a commit's prose body, so parsing has to find
// the actual last paragraph and validate its shape.
const TRAILER_LINE = /^([A-Za-z0-9][A-Za-z0-9-]*): (.*)$/;
const CONTINUATION_LINE = /^[ \t]/;

/**
 * Parses the trailer block out of a raw commit message.
 * @param {string} rawMessage full commit message (subject + body)
 * @returns {Map<string, string[]>} trailer token -> values, in order
 */
export function parseTrailers(rawMessage) {
  const lines = (rawMessage ?? "").replace(/\r\n/g, "\n").split("\n");

  // Drop the subject line, then split the remaining body into paragraphs.
  const bodyLines = lines.slice(1);
  const paragraphs = [];
  let current = [];
  for (const line of bodyLines) {
    if (line.trim() === "") {
      if (current.length > 0) paragraphs.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) paragraphs.push(current);

  const lastParagraph = paragraphs.at(-1);
  if (!lastParagraph || lastParagraph.length === 0) return new Map();

  // The whole last paragraph must be trailer-shaped, or it is prose.
  if (!TRAILER_LINE.test(lastParagraph[0])) return new Map();
  const allValid = lastParagraph.every(
    (line) => TRAILER_LINE.test(line) || CONTINUATION_LINE.test(line),
  );
  if (!allValid) return new Map();

  const trailers = new Map();
  let lastToken = null;
  for (const line of lastParagraph) {
    const match = line.match(TRAILER_LINE);
    if (match) {
      const [, token, value] = match;
      lastToken = token;
      const values = trailers.get(token) ?? [];
      values.push(value.trim());
      trailers.set(token, values);
    } else if (lastToken) {
      const values = trailers.get(lastToken);
      values[values.length - 1] += ` ${line.trim()}`;
    }
  }
  return trailers;
}

/** Case-insensitive lookup of a trailer's first value. */
export function getTrailer(trailers, token) {
  for (const [key, values] of trailers) {
    if (key.toLowerCase() === token.toLowerCase()) return values[0];
  }
  return undefined;
}
