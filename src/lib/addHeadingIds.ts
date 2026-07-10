function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function extractText(node: any): string {
  if (!node) return "";

  if (node.type === "text") {
    return node.text;
  }

  return node.content?.map(extractText).join("") ?? "";
}

export function addHeadingIds(content: any) {
  const clone = structuredClone(content);

  walk(clone);

  return clone;

  function walk(node: any) {
    if (!node) return;

    if (node.type === "heading") {
      node.attrs = {
        ...node.attrs,
        id: slugify(extractText(node)),
      };
    }

    node.content?.forEach(walk);
  }
}
