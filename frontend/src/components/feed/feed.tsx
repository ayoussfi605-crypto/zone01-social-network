/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  Bookmark,
  Bell,
  Compass,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import MobileBottomNav from "../navigation/MobileBottomNav";
import DashboardSidebar from "@/src/components/navigation/DashboardSidebar";
import { SELF } from "@/src/utils/socialPosts";
import type { SocialPost } from "@/src/types/social";
import { postService } from "@/src/services/postService";

const stories = [
  SELF,
  {
    id: 2,
    name: "Noah Bennett",
    handle: "@noahbennett",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=85",
  },
  {
    id: 3,
    name: "Amara Okafor",
    handle: "@amaraokafor",
    avatar:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=85",
  },
  {
    id: 4,
    name: "Theo Martin",
    handle: "@theomartin",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=85",
  },
];

function timeLabel(value: string) {
  const hours = Math.max(
    1,
    Math.floor((Date.now() - Date.parse(value)) / 3600000),
  );
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

export default function FeedPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    postService
      .getFeed()
      .then((feed) => {
        if (active) setPosts(feed);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function toggleLike(postID: string) {
    setPosts((current) =>
      current.map((post) =>
        post.id === postID
          ? {
              ...post,
              liked: !post.liked,
              likes: post.likes + (post.liked ? -1 : 1),
            }
          : post,
      ),
    );
  }

  return (
    <main className="min-h-screen flex bg-white pb-24 text-zinc-900 md:pb-0">
      <div className="min-h-screen min-w-0 flex-1 md:grid md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,680px)_300px]">
        <DashboardSidebar />

        <section className="min-w-0 flex-1 bg-white md:border-r md:border-zinc-200">
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
            <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-4 md:justify-center">
              <Link
                href="/profile"
                aria-label="Open profile"
                className="h-10 w-10 overflow-hidden rounded-full border-2 border-[#C2DCFB] md:hidden"
              >
                <img
                  src={SELF.avatar}
                  alt="Maya Chen"
                  className="h-full w-full object-cover"
                />
              </Link>
              <div className="text-center leading-tight">
                <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 md:block">
                  A little more you
                </p>
                <h1 className="text-xl font-black tracking-[0.16em] text-[#111827]">
                  VIBE
                </h1>
              </div>
              <Link
                href="/notifications"
                aria-label="Notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-900 md:hidden"
              >
                <Bookmark size={18} />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#4ADE80]" />
              </Link>
            </div>
          </header>

          <div className="mx-auto max-w-3xl">
            <section className="border-b border-zinc-200 bg-white px-4 py-3">
              <Link href="/create-post" className="flex items-center gap-3">
                <img
                  src={SELF.avatar}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
                <span className="flex-1 rounded-full bg-[#E5E7EB] px-4 py-2.5 text-sm text-zinc-500">
                  Share a moment, Jordan…
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
                  <Plus size={20} />
                </span>
              </Link>
            </section>

            <div className="flex items-center justify-between px-4 py-4">
              <h2 className="text-base font-bold">For you</h2>
              <button
                type="button"
                className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-xs font-semibold text-[#262626]"
              >
                Latest
              </button>
            </div>

            {loading ? (
              <p className="px-4 py-12 text-center text-sm text-zinc-500">
                Loading your feed…
              </p>
            ) : (
              <ul className="space-y-4 px-3">
                {posts.map((post) => (
                  <li
                    key={post.id}
                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Link
                        href={`/profile/${post.author.id}`}
                        className="h-10 w-10 overflow-hidden rounded-full bg-[#C2DCFB]"
                      >
                        <img
                          src={post.author.avatar}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/profile/${post.author.id}`}
                          className="block truncate text-sm font-bold"
                        >
                          {post.author.name}
                        </Link>
                        <p className="truncate text-xs text-zinc-500">
                          {post.location || post.author.handle} ·{" "}
                          {timeLabel(post.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="More post options"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                    </div>
                    {post.images[0] && (
                      <Link
                        href={`/posts/${post.id}`}
                        className="block bg-[#E5E7EB]"
                      >
                        <img
                          src={post.images[0]}
                          alt={post.caption}
                          className="aspect-[4/4.4] w-full object-cover"
                        />
                      </Link>
                    )}
                    <div className="px-4 pb-4 pt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => toggleLike(post.id)}
                            aria-label={
                              post.liked ? "Unlike post" : "Like post"
                            }
                            className={
                              post.liked ? "text-black" : "text-[#262626]"
                            }
                          >
                            <Heart
                              size={22}
                              fill={post.liked ? "#000000" : "none"}
                            />
                          </button>
                          <Link
                            href={`/posts/${post.id}#comments`}
                            aria-label="View comments"
                            className="text-[#262626]"
                          >
                            <MessageCircle size={22} />
                          </Link>
                        </div>
                        <button
                          type="button"
                          aria-label="Save post"
                          className="text-[#262626]"
                        >
                          <Bookmark size={21} />
                        </button>
                      </div>
                      <p className="mt-2 text-sm font-bold">
                        {post.likes.toLocaleString()} likes
                      </p>
                      <p className="mt-1 text-sm leading-5 text-[#262626]">
                        <span className="mr-1 font-bold">
                          {post.author.handle}
                        </span>
                        {post.caption}
                      </p>
                      <Link
                        href={`/posts/${post.id}#comments`}
                        className="mt-2 block text-sm text-zinc-500"
                      >
                        View all {post.comments.length} comments
                      </Link>
                    </div>
                  </li>
                ))}
                {posts.length === 0 && (
                  <li className="px-4 pb-8 text-center text-sm text-zinc-500">
                    No posts yet. Follow people or share your first vibe.
                  </li>
                )}
              </ul>
            )}
          </div>
        </section>

        <aside className="sticky w-75 top-0 hidden h-screen flex-col gap-5 bg-[#F3F4F6] px-5 py-6 xl:flex">
          <label className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-3 text-[#6B7280]">
            <Compass size={17} />
            <input
              aria-label="Search VIBE"
              placeholder="Search VIBE"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#262626] outline-none placeholder:text-[#6B7280]"
            />
          </label>
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">People to know</h2>
              <Link
                href="/followers"
                className="text-xs font-semibold text-[#6B7280]"
              >
                More
              </Link>
            </div>
            <ul className="mt-4 space-y-4">
              {stories.slice(1).map((person) => (
                <li key={person.id} className="flex items-center gap-3">
                  <Link
                    href={`/profile/${person.id}`}
                    className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#C2DCFB]"
                  >
                    <img
                      src={person.avatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </Link>
                  <Link
                    href={`/profile/${person.id}`}
                    className="min-w-0 flex-1"
                  >
                    <span className="block truncate text-xs font-bold text-[#111827]">
                      {person.name}
                    </span>
                    <span className="block truncate text-[10px] text-[#6B7280]">
                      {person.handle}
                    </span>
                  </Link>
                  <Link
                    href="/followers"
                    aria-label={`Follow ${person.name}`}
                    className="text-xs font-bold text-black"
                  >
                    Follow
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-bold">Your spaces</h2>
            <Link
              href="/groups"
              className="mt-3 flex items-center gap-2 text-sm text-[#262626]"
            >
              <Users size={16} /> Discover groups
            </Link>
            <Link
              href="/notifications"
              className="mt-3 flex items-center justify-between text-sm text-[#262626]"
            >
              <span className="flex items-center gap-2">
                <Bell size={16} /> Notifications
              </span>
              <span className="rounded-full bg-[#E5E7EB] px-2 py-0.5 text-[10px] font-bold">
                New
              </span>
            </Link>
          </section>
          <p className="mt-auto text-[10px] leading-5 text-[#6B7280]">
            About · Community guidelines · Privacy · © 2026 VIBE
          </p>
        </aside>
      </div>

      <Link
        href="/create-post"
        aria-label="Create post"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white md:bottom-8 md:right-8"
      >
        <Plus size={24} />
      </Link>
      <MobileBottomNav active="feed" />
    </main>
  );
}
