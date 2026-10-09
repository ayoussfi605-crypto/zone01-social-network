/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  Bell,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Send,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import MobileBottomNav from "../navigation/MobileBottomNav";
import DashboardSidebar from "@/src/components/navigation/DashboardSidebar";
import type { SocialPost } from "@/src/types/social";
import { postService } from "@/src/services/postService";
import { profileService } from "@/src/services/profileService";
import type { DiscoverableUser } from "@/src/types/profile";
import DeletePostDialog from "@/src/components/posts/DeletePostDialog";

/** Parse backend timestamps (YYYY-MM-DD HH:MM:SS) as UTC to avoid timezone drift. */
function parseUTC(value: string): number {
  // Append "Z" if no timezone indicator present so Date treats it as UTC.
  const normalized = /[TZ+\-]/.test(value) ? value : value.replace(" ", "T") + "Z";
  return Date.parse(normalized);
}

function timeLabel(value: string) {
  const ms = Date.now() - parseUTC(value);
  const minutes = Math.max(1, Math.floor(ms / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function Avatar({ src }: { src?: string }) {
  return src ? (
    <img src={src} alt="" className="h-full w-full object-cover" />
  ) : (
    <span className="flex h-full w-full items-center justify-center bg-[#C2DCFB] text-[#4B5563]">
      <UserRound size={20} aria-hidden="true" />
    </span>
  );
}

export default function FeedPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [me, setMe] = useState<{
    id: number;
    firstName: string;
    avatar: string;
  } | null>(null);
  const [menuPostID, setMenuPostID] = useState<string | null>(null);
  const [deletePostID, setDeletePostID] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState("");

  // Suggested people (from discover API)
  const [suggestedPeople, setSuggestedPeople] = useState<DiscoverableUser[]>([]);

  useEffect(() => {
    let active = true;
    async function loadFeed() {
      try {
        const [feed, currentUser] = await Promise.all([
          postService.getFeed(),
          profileService.getCurrentUser(),
        ]);
        if (!active) return;
        setPosts(feed);
        setMe({
          id: currentUser.id,
          firstName: currentUser.first_name || currentUser.nickname || "",
          avatar: currentUser.avatar_path
            ? profileService.avatarURL(currentUser.avatar_path)
            : "",
        });
      } catch {
        if (active) setFeedError("Could not load feed. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadFeed();
    return () => {
      active = false;
    };
  }, []);

  // Load suggested people from discover API
  useEffect(() => {
    let active = true;
    profileService
      .discoverUsers(5, 0, "")
      .then((page) => {
        if (active) setSuggestedPeople(page.users?.slice(0, 5) ?? []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function profileHref(authorID: number) {
    return authorID === me?.id ? "/profile" : `/profile/${authorID}`;
  }

  // Close post menus when clicking outside
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuPostID && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuPostID(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuPostID]);

  return (
    <main className="min-h-screen flex bg-white pb-24 text-zinc-900 md:pb-0">
      <div className="min-h-screen min-w-0 flex-1 md:grid md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        <DashboardSidebar />

        <section className="min-w-0 flex-1 bg-white md:border-r md:border-zinc-200">
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
            <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-4 md:justify-center">
              <div className="w-[84px] md:hidden">
                <Link
                  href="/profile"
                  aria-label="Open profile"
                  className="block h-10 w-10 overflow-hidden rounded-full border-2 border-[#C2DCFB]"
                >
                  <Avatar src={me?.avatar} />
                </Link>
              </div>
              <div className="text-center leading-tight">
                <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 md:block">
                  A little more you
                </p>
                <h1 className="text-xl font-black tracking-[0.16em] text-[#111827]">
                  Social Network
                </h1>
              </div>
              {/* Reserves room for the fixed GlobalSessionActions on mobile. */}
              <div aria-hidden="true" className="w-[84px] md:hidden" />
            </div>
          </header>

          <div className="mx-auto max-w-3xl">
            <section className="border-b border-zinc-200 bg-white px-4 py-3">
              <Link href="/create-post" className="flex items-center gap-3">
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                  <Avatar src={me?.avatar} />
                </span>
                <span className="flex-1 rounded-full bg-[#E5E7EB] px-4 py-2.5 text-sm text-zinc-500">
                  Share a moment{me?.firstName ? `, ${me.firstName}` : ""}!
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
                  <Plus size={20} />
                </span>
              </Link>
            </section>

            <div className="flex items-center justify-between px-4 py-4">
              <h2 className="text-base font-bold">For you</h2>
            </div>

            {loading ? (
              <p className="px-4 py-12 text-center text-sm text-zinc-500">
                Loading your feed…
              </p>
            ) : feedError ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-red-600">{feedError}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-3 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white"
                >
                  Retry
                </button>
              </div>
            ) : (
              <ul className="space-y-4 px-3">
                {posts.map((post) => (
                  <li
                    key={post.id}
                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
                  >
                    {/* Post header */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Link
                        href={profileHref(post.author.id)}
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
                          href={profileHref(post.author.id)}
                          className="block truncate text-sm font-bold"
                        >
                          {post.author.name}
                        </Link>
                        <p className="truncate text-xs text-zinc-500">
                          {post.author.handle} ·{" "}
                          {timeLabel(post.createdAt)}
                          {post.privacy !== "public" && (
                            <span className="ml-1 text-[10px] text-zinc-400">
                              · {post.privacy === "private" ? "🔒" : "👥"}
                            </span>
                          )}
                        </p>
                      </div>
                      {post.author.id === me?.id && (
                        <div className="relative" ref={menuPostID === post.id ? menuRef : undefined}>
                          <button
                            type="button"
                            aria-label="More post options"
                            aria-haspopup="menu"
                            aria-expanded={menuPostID === post.id}
                            onClick={() =>
                              setMenuPostID((current) =>
                                current === post.id ? null : post.id,
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 hover:bg-[#F3F4F6]"
                          >
                            <MoreHorizontal size={20} />
                          </button>
                          {menuPostID === post.id && (
                            <div
                              role="menu"
                              className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setMenuPostID(null);
                                  setDeletePostID(post.id);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-[#111827] hover:bg-[#F3F4F6]"
                              >
                                <Trash2 size={15} /> Delete post
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Post content (FB style: text first) */}
                    {post.caption && (
                      <div className="px-4 pb-3 pt-1">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-[#111827]">
                          {post.caption}
                        </p>
                      </div>
                    )}

                    {/* Post image (optional, below text) */}
                    {post.image && (
                      <Link
                        href={`/posts/${post.id}`}
                        className="block overflow-hidden bg-zinc-100"
                      >
                        <img
                          src={post.image}
                          alt={post.caption || "Post image"}
                          className="max-h-[550px] w-full object-cover sm:object-contain"
                        />
                      </Link>
                    )}

                    {/* Post comments link (navigates to post details) */}
                    <div className="px-4 pb-4 pt-3">
                      <Link
                        href={`/posts/${post.id}#comments`}
                        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800"
                      >
                        <MessageCircle size={18} />
                        <span>
                          {post.commentCount === 0
                            ? "Comment"
                            : `View all ${post.commentCount} ${post.commentCount === 1 ? "comment" : "comments"}`}
                        </span>
                      </Link>
                    </div>
                  </li>
                ))}
                {posts.length === 0 && (
                  <li className="px-4 pb-8 text-center text-sm text-zinc-500">
                    No posts yet. Follow people or share your first post.
                  </li>
                )}
              </ul>
            )}
          </div>
        </section>

        {/* Right sidebar */}
        <aside className="sticky top-0 hidden h-screen flex-col gap-5 bg-[#F3F4F6] px-5 pb-6 pt-20 xl:flex">
          {suggestedPeople.length > 0 && (
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
                {suggestedPeople.map((person) => (
                  <li key={person.id} className="flex items-center gap-3">
                    <Link
                      href={`/profile/${person.id}`}
                      className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#C2DCFB]"
                    >
                      {person.avatar_path ? (
                        <img
                          src={profileService.avatarURL(person.avatar_path)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[#4B5563]">
                          <UserRound size={18} />
                        </span>
                      )}
                    </Link>
                    <Link
                      href={`/profile/${person.id}`}
                      className="min-w-0 flex-1"
                    >
                      <span className="block truncate text-xs font-bold text-[#111827]">
                        {person.first_name} {person.last_name}
                      </span>
                      {person.nickname && (
                        <span className="block truncate text-[10px] text-[#6B7280]">
                          @{person.nickname}
                        </span>
                      )}
                    </Link>
                    <Link
                      href={`/profile/${person.id}`}
                      aria-label={`View ${person.first_name}`}
                      className="text-xs font-bold text-black"
                    >
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
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
            About · Community guidelines · Privacy · © 2026 Social Network
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
      {deletePostID && (
        <DeletePostDialog
          postID={deletePostID}
          onCancel={() => setDeletePostID(null)}
          onDeleted={() => {
            setPosts((current) =>
              current.filter((post) => post.id !== deletePostID),
            );
            setDeletePostID(null);
          }}
        />
      )}
    </main>
  );
}
