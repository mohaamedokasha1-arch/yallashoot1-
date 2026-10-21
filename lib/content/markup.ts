/**
 * Minimal, safe article markup (subset of Markdown) parsed into a tree that is
 * rendered with React elements — no raw HTML is ever injected.
 *
 * Supported: "## heading", "### heading", "- list item", blank-line separated
 * paragraphs, **bold**, and [text](https://link).
 */

export type Inline = { type: "text"; value: string } | { type: "bold"; value: string } | { type: "link"; value: string; href: string };

export type Block =
  | { type: "h2"; content: Inline[] }
  | { type: "h3"; content: Inline[] }
  | { type: "p"; content: Inline[] }
  | { type: "ul"; items: Inline[][] };

export function safeHref(href: string): string | null {
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]{1,200})\]\(([^)\s]{1,500})\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ type: "bold", value: m[1] });
    else if (m[2] !== undefined && m[3] !== undefined) {
      const href = safeHref(m[3]);
      out.push(href ? { type: "link", value: m[2], href } : { type: "text", value: m[2] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

export function parseMarkup(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "p", content: parseInline(paragraph.join(" ").trim()) });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: "ul", items: list.map((item) => parseInline(item)) });
    list = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
    } else if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h3", content: parseInline(line.slice(4)) });
    } else if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h2", content: parseInline(line.slice(3)) });
    } else if (/^[-*] /.test(line)) {
      flushParagraph();
      list.push(line.slice(2));
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

export function plainText(source: string, max = 300): string {
  const text = source
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_>`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}
