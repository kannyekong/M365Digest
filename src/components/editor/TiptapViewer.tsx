import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { addHeadingIds } from "../../lib/addHeadingIds";
import CustomHeading from "./CustomHeading";

interface Props {
  content: any;
}

export default function TiptapViewer({ content }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),

      CustomHeading,
    ],

    content: addHeadingIds(content),

    editable: false,

    immediatelyRender: false,

    editorProps: {
      attributes: {
        class: "prose prose-slate lg:prose-lg max-w-none focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
