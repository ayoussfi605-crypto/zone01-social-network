"use client";

import { useEffect, useState } from "react";
import { postService } from "@/src/services/postService";

type Props = {
  postID: string;
  onCancel: () => void;
  onDeleted: () => void;
};


export default function DeletePostDialog({ postID, onCancel, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleting, onCancel]);

  async function confirmDelete() {
    setDeleting(true);
    setError("");
    try {
      await postService.deletePost(postID);
      onDeleted();
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "Could not delete this post.",
      );
      setDeleting(false);
    }
  }

  return (
    <div
      role="presentation"
      onClick={() => !deleting && onCancel()}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-post-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5 text-[#111827] shadow-lg"
      >
        <h2 id="delete-post-title" className="text-base font-bold">
          Delete this post?
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          The post, its image and its comments will be removed for good.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-[#F3F4F6] p-3 text-sm text-[#262626]"
          >
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirmDelete()}
            disabled={deleting}
            autoFocus
            className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
