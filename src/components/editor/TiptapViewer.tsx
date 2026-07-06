import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface Props {
  content: any;
}

export default function TiptapViewer({ content }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],

    content,

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
