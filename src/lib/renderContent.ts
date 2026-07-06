import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";

export function renderContent(content: any) {
  if (!content) {
    return "";
  }

  return generateHTML(content, [StarterKit]);
}
