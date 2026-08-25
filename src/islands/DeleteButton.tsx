import { Trash2 } from "lucide-react";
import { deletePost } from "../lib/blog";
import { toast } from "react-toastify";
import { useState } from "react";
import ConfirmModal from "./ConfirmModal";

interface Props {
  id: string;
  onDelete?: (id: string) => void;
}

export default function DeleteButton({ id, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  async function handleDelete() {
    setOpen(true);
  }

  async function confirmDelete() {
    const { error } = await deletePost(id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Article deleted");

    onDelete?.(id);

    setOpen(false);
  }

  return (
    <>
      <button
        onClick={handleDelete}
        className="rounded-xl px-2 py-2 text-red-600 hover:bg-red-200"
      >
        <Trash2 />
      </button>

      <ConfirmModal
        open={open}
        title="Delete Article"
        message="Are you sure you want to permanently delete this article?"
        confirmText="Delete"
        variant="danger"
        onCancel={() => setOpen(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
