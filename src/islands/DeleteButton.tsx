import { deletePost } from "../lib/blog";

interface Props {
  id: string;
}

export default function DeleteButton({ id }: Props) {
  async function handleDelete() {
    const confirmed = confirm("Delete this article permanently?");

    if (!confirmed) return;

    const { error } = await deletePost(id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  return (
    <button
      onClick={handleDelete}
      className="rounded-lg bg-red-100 px-4 py-2 text-red-600 hover:bg-red-200"
    >
      Delete
    </button>
  );
}
