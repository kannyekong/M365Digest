export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function generateTableOfContents(content: any): TocItem[] {
  const headings: TocItem[] = [];

  walk(content);

  return headings;

  function walk(node: any) {
    if (!node) return;

    if (node.type === "heading") {
      const text = extractText(node);

      headings.push({
        id: slugify(text),
        text,
        level: node.attrs?.level ?? 2,
      });
    }

    if (node.content) {
      node.content.forEach(walk);
    }
  }
}

function extractText(node: any): string {
  if (!node) return "";

  if (node.type === "text") {
    return node.text;
  }

  return node.content?.map(extractText).join("") ?? "";
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}
