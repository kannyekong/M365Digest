import type { Editor } from "@tiptap/react";

import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code2,
  Undo2,
  Redo2,
} from "lucide-react";

interface ToolbarProps {
  editor: Editor | null;
}

export default function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  function Button({
    onClick,
    active,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-lg p-2 transition ${
          active ? "bg-red-600 text-white" : "hover:bg-slate-100 text-slate-700"
        }`}
      >
        {children}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50 p-3">
      <Button
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={18} />
      </Button>

      <Button
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={18} />
      </Button>

      <Button
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={18} />
      </Button>

      <div className="mx-2 h-6 w-px bg-slate-300" />

      <Button
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={18} />
      </Button>

      <Button
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={18} />
      </Button>

      <div className="mx-2 h-6 w-px bg-slate-300" />

      <Button
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={18} />
      </Button>

      <Button
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={18} />
      </Button>

      <Button
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={18} />
      </Button>

      <Button
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 size={18} />
      </Button>

      <div className="ml-auto flex gap-2">
        <Button onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={18} />
        </Button>

        <Button onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={18} />
        </Button>
      </div>
    </div>
  );
}
