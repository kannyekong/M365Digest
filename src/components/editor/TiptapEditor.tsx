import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import { common, createLowlight } from "lowlight";

import Toolbar from "./Toolbar";

const lowlight = createLowlight(common);

interface TiptapEditorProps {
  value: any;
  onChange: (value: any) => void;
}

export default function TiptapEditor({ value, onChange }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),

      CodeBlockLowlight.configure({
        lowlight,
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "my-8 h-auto w-full rounded-2xl object-cover shadow-md",
        },
      }),
    ],

    content: value,

    immediatelyRender: false,

    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none min-h-[400px] focus:outline-none p-6",
      },
    },

    onUpdate({ editor }) {
      onChange(editor.getJSON());
    },
  });

  useEffect(() => {
    if (!editor) return;

    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(value);

    if (current !== incoming) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <Toolbar editor={editor} />

      <EditorContent editor={editor} />
    </div>
  );
}
