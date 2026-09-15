import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import { common, createLowlight } from "lowlight";
import { addHeadingIds } from "../../lib/addHeadingIds";
import CustomHeading from "./CustomHeading";

const lowlight = createLowlight(common);

interface Props {
  content: any;
}

export default function TiptapViewer({ content }: Props) {
  /* Creates a read-only Tiptap instance for rendering published blog content. */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),

      CustomHeading,

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
