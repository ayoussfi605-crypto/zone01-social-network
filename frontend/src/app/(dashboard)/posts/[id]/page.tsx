"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ImagePlus,
  Send,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { profileService } from "@/src/services/profileService";
import { postService } from "@/src/services/postService";
import type { SocialPost } from "@/src/types/social";
import type { User } from "@/src/types/user";
import DeletePostDialog from "@/src/components/posts/DeletePostDialog";

/** Parse backend timestamps (YYYY-MM-DD HH:MM:SS) as UTC. */
function parseUTC(value: string): number {
  const normalized = /[TZ+\-]/.test(value) ? value : value.replace(" ", "T") + "Z";
  return Date.parse(normalized);
}

function formatDate(value: string) {
  const ts = parseUTC(value);
  return Number.isNaN(ts) ? value : new Date(ts).toLocaleString();
}

export default function PostDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [post, setPost] = useState<SocialPost | null>(null);
  const [postReason, setPostReason] = useState<"ok" | "forbidden" | "not_found" | "error">("ok");
  const [comment, setComment] = useState("");
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [commentPreview, setCommentPreview] = useState("");
  const commentPreviewRef = useRef("");

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [commentError, setCommentError] = useState("");

  // Clean up object URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (commentPreviewRef.current) {
        URL.revokeObjectURL(commentPreviewRef.current);
      }
    };
  }, []);

  function setPreview(url: string) {
    if (commentPreviewRef.current) {
      URL.revokeObjectURL(commentPreviewRef.current);
    }
    commentPreviewRef.current = url;
    setCommentPreview(url);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setCheckingAccess(true);
      try {
        const [user, result] = await Promise.all([
          profileService.getCurrentUser().catch(() => null),
          postService.getPost(params.id),
        ]);
        if (!active) return;
        setCurrentUser(user);
        setPost(result.post);
        setPostReason(result.reason);
      } catch {
        if (active) {
          setPost(null);
          setPostReason("error");
        }
      } finally {
        if (active) setCheckingAccess(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [params.id]);

  function profileHref(authorID: number) {
    return authorID === currentUser?.id ? "/profile" : `/profile/${authorID}`;
  }

  async function addComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!post || (!comment.trim() && !commentFile)) return;
    setCommentError("");
    try {
      const newComment = await postService.createComment(post.id, {
        content: comment.trim(),
        image: commentFile,
      });
      setPost((current) =>
        current
          ? {
              ...current,
              comments: [...current.comments, newComment],
              commentCount: current.commentCount + 1,
            }
          : current,
      );
      setComment("");
      setCommentFile(null);
      setPreview("");
    } catch (reason: unknown) {
      setCommentError(
        reason instanceof Error ? reason.message : "Could not post comment",
      );
    }
  }

  if (checkingAccess) {
    return (
      <main className="min-h-screen bg-white px-5 py-8 text-zinc-900">
        <p className="mx-auto mt-16 max-w-sm text-center text-sm text-zinc-500">
          Checking post access…
        </p>
      </main>
    );
  }

  if (!post) {
    let message = "This post is unavailable.";
    if (postReason === "forbidden")
      message = "You don\u2019t have permission to view this post.";
    else if (postReason === "not_found")
      message = "This post doesn\u2019t exist or has been deleted.";

    return (
      <main className="min-h-screen bg-white px-5 py-8 text-zinc-900">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold"
        >
          <ArrowLeft size={17} /> Feed
        </Link>
        <p className="mx-auto mt-16 max-w-sm text-center text-sm text-zinc-500">
          {message}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-24 text-zinc-900">
      <header className="sticky top-0 z-20 flex h-14 items-center border-b border-zinc-200 bg-white pl-4 session-actions-gap">
        <Link
          href="/"
          aria-label="Back to feed"
          className="flex h-10 w-10 items-center justify-center rounded-full"
        >
          <ArrowLeft size={21} />
        </Link>
        <h1 className="ml-2 text-sm font-bold">Post</h1>
      </header>

      <article className="mx-auto max-w-xl">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={profileHref(post.author.id)}>
            <img
              src={post.author.avatar}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={profileHref(post.author.id)}
              className="truncate text-sm font-bold hover:underline"
            >
              {post.author.name}
            </Link>
            <p className="text-xs text-zinc-500">
              {post.author.handle} · {formatDate(post.createdAt)}
              {post.privacy !== "public" && (
                <span className="ml-1 text-zinc-400">
                  · {post.privacy === "private" ? "🔒 Private" : "👥 Followers"}
                </span>
              )}
            </p>
          </div>
          {currentUser?.id === post.author.id && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-[#262626] hover:bg-[#F3F4F6]"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>

        {/* Post content (FB style: text first) */}
        {post.caption && (
          <div className="px-4 pb-3 pt-1">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#111827]">
              {post.caption}
            </p>
          </div>
        )}

        {/* Post image (optional, below text) */}
        {post.image && (
          <div className="flex max-h-[70dvh] items-center justify-center overflow-hidden bg-zinc-100">
            <img
              src={post.image}
              alt={post.caption || "Post attachment"}
              className="max-h-[70dvh] w-full object-contain"
            />
          </div>
        )}

        <section id="comments" className="border-t border-zinc-200 px-4 py-4">
          <h2 className="mb-4 text-sm font-bold">
            Comments{" "}
            <span className="text-zinc-500">{post.commentCount}</span>
          </h2>
          {post.comments.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">
              Start the conversation.
            </p>
          ) : (
            <ul className="space-y-5">
              {post.comments.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <Link href={profileHref(item.author.id)}>
                    <img
                      src={item.author.avatar}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-5 text-[#262626]">
                      <Link
                        href={profileHref(item.author.id)}
                        className="mr-2 font-bold hover:underline"
                      >
                        {item.author.handle}
                      </Link>
                      {item.text}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {formatDate(item.createdAt)}
                    </p>
                    {item.image && (
                      <img
                        src={item.image}
                        alt="Comment attachment"
                        className="mt-2 max-h-48 rounded-xl object-cover"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>

      <form
        onSubmit={(event) => void addComment(event)}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white pb-[max(env(safe-area-inset-bottom),8px)]"
      >
        {commentError && (
          <p className="mx-auto max-w-xl px-4 pt-2 text-xs text-red-700">
            {commentError}
          </p>
        )}
        {commentPreview && (
          <div className="mx-auto flex max-w-xl items-center gap-2 px-4 pt-2">
            <img
              src={commentPreview}
              alt="Comment attachment preview"
              className="h-12 w-12 rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setCommentFile(null);
                setPreview("");
              }}
              aria-label="Remove attachment"
              className="text-[#6B7280]"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          {currentUser?.avatar_path ? (
            <img
              src={profileService.avatarURL(currentUser.avatar_path)}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C2DCFB] text-[#4B5563]">
              <UserRound size={18} aria-hidden="true" />
            </span>
          )}
          <input
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              if (commentError) setCommentError("");
            }}
            placeholder="Add a comment…"
            maxLength={1000}
            className="min-w-0 flex-1 rounded-full bg-[#E5E7EB] px-4 py-2.5 text-sm outline-none placeholder:text-zinc-500"
          />
          <label
            aria-label="Attach image"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#6B7280]"
          >
            <ImagePlus size={18} />
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                  setCommentError("Choose an image under 5 MB.");
                  event.target.value = "";
                  return;
                }
                setCommentFile(file);
                setPreview(URL.createObjectURL(file));
                event.target.value = "";
              }}
            />
          </label>
          <button
            type="submit"
            disabled={!comment.trim() && !commentFile}
            aria-label="Send comment"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
          >
            <Send size={17} />
          </button>
        </div>
      </form>
      {confirmDelete && (
        <DeletePostDialog
          postID={post.id}
          onCancel={() => setConfirmDelete(false)}
          onDeleted={() => router.replace("/")}
        />
      )}
    </main>
  );
}
