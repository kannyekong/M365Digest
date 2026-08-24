import { Heart, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/superbase";

interface BlogLikeButtonProps {
  postId: string;
  initialLikes?: number;
}

/* Returns the local browser key used to remember a liked blog post. */
function getLikeStorageKey(postId: string) {
  return `cloudtweak-blog-like-${postId}`;
}

/* Displays and manages anonymous likes for one CloudTweak blog post. */
export default function BlogLikeButton({
  postId,
  initialLikes = 0,
}: BlogLikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  /* Loads the latest like count and checks whether this browser already liked the post. */
  useEffect(() => {
    async function loadLikeState() {
      const storedLike =
        window.localStorage.getItem(getLikeStorageKey(postId)) === "true";

      setLiked(storedLike);

      const { data, error } = await supabase
        .from("blog_posts")
        .select("likes_count")
        .eq("id", postId)
        .single();

      if (error) {
        console.error("Failed to load blog likes:", error);
        return;
      }

      setLikes(data?.likes_count ?? 0);
    }

    void loadLikeState();
  }, [postId]);

  /* Adds one anonymous like and remembers it on the current browser. */
  async function handleLike() {
    if (liked || liking) {
      return;
    }

    setLiking(true);

    try {
      const { data, error } = await supabase.rpc("increment_blog_post_like", {
        p_post_id: postId,
      });

      if (error) {
        throw error;
      }

      setLikes(Number(data));
      setLiked(true);

      window.localStorage.setItem(getLikeStorageKey(postId), "true");
    } catch (error) {
      console.error("Failed to like blog post:", error);
    } finally {
      setLiking(false);
    }
  }

  return (
    <div className="flex items-center justify-center">
      <button
        type="button"
        onClick={() => {
          void handleLike();
        }}
        disabled={liked || liking}
        aria-label={liked ? "You liked this article" : "Like this article"}
        className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-500 disabled:cursor-default dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        {liking ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Heart
            className={
              liked
                ? "h-4 w-4 fill-red-500 text-red-500"
                : "h-4 w-4 transition group-hover:fill-red-500 group-hover:text-red-500"
            }
          />
        )}

        <span>{liked ? "Liked" : "Like this article"}</span>

        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {likes}
        </span>
      </button>
    </div>
  );
}
