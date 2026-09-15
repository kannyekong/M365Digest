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
  ImagePlus,
  LoaderCircle,
  Undo2,
  Redo2,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { uploadCoverImage } from "../../lib/storage";

interface ToolbarProps {
  editor: Editor | null;
  bucket?: string;
}

export default function Toolbar({
  editor,
  bucket = "blog-images",
}: ToolbarProps) {
  /* Stores a reference to the hidden article image input. */
  const imageInputRef = useRef<HTMLInputElement>(null);

  /* Tracks whether an article image is currently uploading. */
  const [uploadingImage, setUploadingImage] = useState(false);

  if (!editor) return null;

  /* Keeps a non-null editor reference available inside asynchronous handlers. */
  const activeEditor = editor;

  /* Renders a reusable toolbar action button. */
  function Button({
    onClick,
    active,
    disabled,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title?: string;
    children: React.ReactNode;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`rounded-lg p-2 transition ${
          active ? "bg-red-600 text-white" : "text-slate-700 hover:bg-slate-100"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {children}
      </button>
    );
  }

  /* Opens the system file picker for selecting an article image. */
  function handleSelectImage() {
    if (uploadingImage) return;

    imageInputRef.current?.click();
  }

  /* Uploads an image to Supabase and inserts it into the article. */
  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    /* Rejects unsupported image formats before uploading. */
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a JPG, PNG, WebP, or AVIF image.");
      event.target.value = "";
      return;
    }

    const maxFileSize = 5 * 1024 * 1024;

    /* Prevents excessively large article images from being uploaded. */
    if (file.size > maxFileSize) {
      toast.error("Article images must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    /*
     * Captures the current cursor position before the asynchronous upload
     * begins so the image can be inserted at the intended location.
     */
    const insertPosition = activeEditor.state.selection.from;

    setUploadingImage(true);

    try {
      /* Uploads the selected image using the existing Supabase helper. */
      const { data, error } = await uploadCoverImage(file, bucket);

      if (error) {
        toast.error(error.message);
        return;
      }

      if (!data) {
        toast.error("The image uploaded, but its URL could not be retrieved.");
        return;
      }

      /*
       * Restores the cursor position and inserts the uploaded image
       * into the Tiptap document.
       */
      activeEditor
        .chain()
        .focus()
        .setTextSelection(insertPosition)
        .setImage({
          src: data,
          alt: file.name.replace(/\.[^/.]+$/, ""),
          title: file.name,
        })
        .run();

      toast.success("Article image inserted successfully.");
    } catch (error) {
      console.error("Unexpected article image upload error:", error);

      toast.error("The article image could not be uploaded.");
    } finally {
      setUploadingImage(false);

      /* Resets the input so the same file can be selected again. */
      event.target.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50 p-3">
      <Button
        title="Bold"
        active={activeEditor.isActive("bold")}
        onClick={() => activeEditor.chain().focus().toggleBold().run()}
      >
        <Bold size={18} />
      </Button>

      <Button
        title="Italic"
        active={activeEditor.isActive("italic")}
        onClick={() => activeEditor.chain().focus().toggleItalic().run()}
      >
        <Italic size={18} />
      </Button>

      <Button
        title="Strikethrough"
        active={activeEditor.isActive("strike")}
        onClick={() => activeEditor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={18} />
      </Button>

      <div className="mx-2 h-6 w-px bg-slate-300" />

      <Button
        title="Heading 1"
        active={activeEditor.isActive("heading", { level: 1 })}
        onClick={() =>
          activeEditor.chain().focus().toggleHeading({ level: 1 }).run()
        }
      >
        <Heading1 size={18} />
      </Button>

      <Button
        title="Heading 2"
        active={activeEditor.isActive("heading", { level: 2 })}
        onClick={() =>
          activeEditor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        <Heading2 size={18} />
      </Button>

      <div className="mx-2 h-6 w-px bg-slate-300" />

      <Button
        title="Bullet list"
        active={activeEditor.isActive("bulletList")}
        onClick={() => activeEditor.chain().focus().toggleBulletList().run()}
      >
        <List size={18} />
      </Button>

      <Button
        title="Numbered list"
        active={activeEditor.isActive("orderedList")}
        onClick={() => activeEditor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={18} />
      </Button>

      <Button
        title="Blockquote"
        active={activeEditor.isActive("blockquote")}
        onClick={() => activeEditor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={18} />
      </Button>

      <Button
        title="Code block"
        active={activeEditor.isActive("codeBlock")}
        onClick={() => activeEditor.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 size={18} />
      </Button>

      <div className="mx-2 h-6 w-px bg-slate-300" />

      <Button
        title={uploadingImage ? "Uploading image..." : "Insert image"}
        disabled={uploadingImage}
        onClick={handleSelectImage}
      >
        {uploadingImage ? (
          <LoaderCircle size={18} className="animate-spin" />
        ) : (
          <ImagePlus size={18} />
        )}
      </Button>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        hidden
        onChange={handleImageUpload}
      />

      <div className="ml-auto flex gap-2">
        <Button
          title="Undo"
          onClick={() => activeEditor.chain().focus().undo().run()}
        >
          <Undo2 size={18} />
        </Button>

        <Button
          title="Redo"
          onClick={() => activeEditor.chain().focus().redo().run()}
        >
          <Redo2 size={18} />
        </Button>
      </div>
    </div>
  );
}
