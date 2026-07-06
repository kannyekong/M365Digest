export function calculateReadingTime(content: any): string {
  const text = extractText(content);

  const words = text.trim().split(/\s+/).length;

  const minutes = Math.max(1, Math.ceil(words / 200));

  return `${minutes} min read`;
}

function extractText(node: any): string {
  if (!node) return "";

  let text = "";

  if (node.type === "text") {
    text += node.text + " ";
  }

  if (node.content) {
    for (const child of node.content) {
      text += extractText(child);
    }
  }

  return text;
}
