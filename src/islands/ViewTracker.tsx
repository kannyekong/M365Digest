import { useEffect } from "react";
import { incrementViews } from "../lib/incrementViews";



interface Props {
  postId: string;
}

export default function ViewTracker({ postId }: Props) {
  useEffect(() => {
    const key = `viewed-${postId}`;

    if (localStorage.getItem(key)) return;

    incrementViews(postId);

    localStorage.setItem(key, "true");
  }, [postId]);

  return null;
}
