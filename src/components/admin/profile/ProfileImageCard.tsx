import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser, updateProfileImage } from "../../../lib/profile";
import { uploadCoverImage } from "../../../lib/storage";

export default function ProfileImageCard() {
  const [user, setUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const { data } = await getCurrentUser();

    setUser(data.user);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length || !user) return;

    const file = e.target.files[0];

    setUploading(true);

    const { data, error } = await uploadCoverImage(
      file,
      "profile-images",
      `${user.id}.jpg`
    );

    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }

    const { error: updateError } = await updateProfileImage(
      `${data}?v=${Date.now()}`
    );

    setUploading(false);

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    toast.success("Profile image updated.");

    loadUser();
  }

  const avatar = user?.user_metadata?.avatar_url;

  const initials = user?.email?.substring(0, 2).toUpperCase() ?? "A";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold">Profile Picture</h2>

      <div className="mt-8 flex flex-col items-center gap-5">
        {avatar ? (
          <img
            src={avatar}
            className="h-32 w-32 rounded-full border object-cover"
          />
        ) : (
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary text-4xl font-bold text-white">
            {initials}
          </div>
        )}

        <label className="cursor-pointer rounded-xl bg-primary px-5 py-3 text-white hover:opacity-90">
          {uploading ? "Uploading..." : "Upload New Photo"}

          <input hidden type="file" accept="image/*" onChange={handleUpload} />
        </label>
      </div>
    </div>
  );
}
