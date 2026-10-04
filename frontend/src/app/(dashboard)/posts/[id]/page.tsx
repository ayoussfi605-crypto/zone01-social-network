"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Heart, MapPin, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { profileService } from "@/src/services/profileService";
import {
  canViewSocialPost,
  newSocialID,
  loadSocialPosts,
  saveSocialPosts,
  SELF,
  subscribeToSocialPosts,
} from "@/src/utils/socialPosts";
import type { SocialPost } from "@/src/types/social";
import type { User } from "@/src/types/user";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function PostDetailsPage() {
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<SocialPost | null>(null);
  const [comment, setComment] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      setCheckingAccess(true);
      try {
        const user = await profileService.getCurrentUser();
        const following = await profileService.getFollowing(user.id);
        const candidate = loadSocialPosts().find((item) => item.id === params.id) ?? null;
        if (!active) return;
        setCurrentUser(user);
        setPost(candidate && canViewSocialPost(candidate, user.id, following.map((person) => person.id)) ? candidate : null);
      } catch {
        if (active) setPost(null);
      } finally {
        if (active) setCheckingAccess(false);
      }
    };
    void refresh();
    const unsubscribe = subscribeToSocialPosts(() => void refresh());
    return () => {
      active = false;
      unsubscribe();
    };
  }, [params.id]);

  function toggleLike() {
    if (!post) return;
    const updated = loadSocialPosts().map((item) =>
      item.id === post.id
        ? {
            ...item,
            liked: !item.liked,
            likes: item.likes + (item.liked ? -1 : 1),
          }
        : item,
    );
    saveSocialPosts(updated);
  }

  function addComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!post || !comment.trim()) return;
    const newComment = {
      id: newSocialID("comment"),
      author: currentUser
        ? {
            id: currentUser.id,
            name: `${currentUser.first_name} ${currentUser.last_name}`,
            handle: `@${currentUser.nickname || `${currentUser.first_name}${currentUser.last_name}`.replace(/\s+/g, "").toLowerCase()}`,
            avatar: currentUser.avatar_path ? profileService.avatarURL(currentUser.avatar_path) : SELF.avatar,
          }
        : SELF,
      text: comment.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = loadSocialPosts().map((item) =>
      item.id === post.id
        ? { ...item, comments: [...item.comments, newComment] }
        : item,
    );
    saveSocialPosts(updated);
    setComment("");
  }

  if (checkingAccess) {
    return (
      <main className="min-h-screen bg-white px-5 py-8 text-zinc-900">
        <p className="mx-auto mt-16 max-w-sm text-center text-sm text-zinc-500">Checking post access…</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-white px-5 py-8 text-zinc-900">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold"
        >
          <ArrowLeft size={17} /> Feed
        </Link>
        <p className="mx-auto mt-16 max-w-sm text-center text-sm text-zinc-500">
          This post is unavailable.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-24 text-zinc-900">
      <header className="sticky top-0 z-20 flex h-14 items-center border-b border-zinc-200 bg-white px-4">
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
          <img
            src={post.author.avatar}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{post.author.name}</p>
            <p className="text-xs text-zinc-500">
              {post.author.handle} · {formatDate(post.createdAt)}
            </p>
          </div>
          {post.location && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <MapPin size={13} />
              {post.location}
            </span>
          )}
        </div>

        {post.images.map((image, index) => (
          <div
            key={`${post.id}-${index}`}
            className="flex max-h-[70dvh] items-center justify-center bg-black"
          >
            <img
              src={image}
              alt={post.caption || "Post attachment"}
              className="max-h-[70dvh] w-full object-contain"
            />
          </div>
        ))}

        <div className="px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleLike}
              aria-label={post.liked ? "Unlike post" : "Like post"}
              className="text-[#262626]"
            >
              <Heart size={23} fill={post.liked ? "#000000" : "none"} />
            </button>
            <span className="text-sm font-bold">
              {post.likes.toLocaleString()} likes
            </span>
          </div>
          {post.caption && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#262626]">
              <span className="mr-1 font-bold">{post.author.handle}</span>
              {post.caption}
            </p>
          )}
        </div>

        <section id="comments" className="border-t border-zinc-200 px-4 py-4">
          <h2 className="mb-4 text-sm font-bold">
            Comments{" "}
            <span className="text-zinc-500">{post.comments.length}</span>
          </h2>
          {post.comments.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">
              Start the conversation.
            </p>
          ) : (
            <ul className="space-y-5">
              {post.comments.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <img
                    src={item.author.avatar}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-5 text-[#262626]">
                      <span className="mr-2 font-bold">
                        {item.author.handle}
                      </span>
                      {item.text}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>

      <form
        onSubmit={addComment}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white pb-[max(env(safe-area-inset-bottom),8px)]"
      >
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <img
            src={SELF.avatar}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
          />
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add a comment…"
            maxLength={1000}
            className="min-w-0 flex-1 rounded-full bg-[#E5E7EB] px-4 py-2.5 text-sm outline-none placeholder:text-zinc-500"
          />
          <button
            type="submit"
            disabled={!comment.trim()}
            aria-label="Send comment"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
          >
            <Send size={17} />
          </button>
        </div>
      </form>
    </main>
  );
}
