"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Camera, Grid3X3, Heart, Pencil, Plus } from "lucide-react";
import { profileService } from "@/src/services/profileService";
import { postService } from "@/src/services/postService";
import { SELF } from "@/src/utils/socialPosts";
import type { SocialPost } from "@/src/types/social";
import type { User } from "@/src/types/user";

const tabs = ["MY VIBES"] as const;
const defaultBio =
  "Architecting digital experiences and chasing the perfect minimalist aesthetic. Always vibing with new ideas.";

export default function MyProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("MY VIBES");
  const [bio, setBio] = useState(defaultBio);
  const [draftBio, setDraftBio] = useState(defaultBio);
  const [draftIsPrivate, setDraftIsPrivate] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const currentUser = await profileService.getCurrentUser();
        const [followers, following] = await Promise.all([
          profileService.getFollowers(currentUser.id),
          profileService.getFollowing(currentUser.id),
        ]);
        if (!active) return;
        setUser(currentUser);
        setFollowersCount(followers.length);
        setFollowingCount(following.length);
        const ownPosts = await postService.getUserPosts(currentUser.id);
        if (active) setPosts(ownPosts);
        const savedBio = window.localStorage.getItem("vibe.profile.bio");
        const nextBio = savedBio ?? currentUser.about_me ?? defaultBio;
        setBio(nextBio);
        setDraftBio(nextBio);
      } catch (reason: unknown) {
        if (!active) return;
        const message =
          reason instanceof Error ? reason.message : "Could not load profile";
        setError(message);
        if (message.toLowerCase().includes("not logged in"))
          router.push("/login");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProfile();
    return () => {
      active = false;
    };
  }, [router]);

  const ownPosts = useMemo(
    () => posts.filter((post) => user && post.author.id === user.id),
    [posts, user],
  );

  const visiblePosts = ownPosts;

  const firstName = user?.first_name || "Jordan";
  const lastName = user?.last_name || "Carter";
  const handle = (user?.nickname || "JORDAN_VIBE")
    .replace(/^@/, "")
    .toUpperCase();
  const avatar = user?.avatar_path
    ? profileService.avatarURL(user.avatar_path)
    : SELF.avatar;
  const postCount = ownPosts.length || 12;
  const likesCount = 15400;

  return (
    <main className="min-h-screen bg-white pb-24 text-[#111827]">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-black tracking-[0.18em]">
            VIBE
          </Link>
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold"
          >
            Notifications
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-3 py-5 sm:px-5 sm:py-8">
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-[#F3F4F6] p-3 text-sm text-[#262626]"
          >
            {error}
          </p>
        )}
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="h-28 bg-[#C2DCFB] sm:h-36" />
          <div className="px-5 pb-5 sm:px-8 sm:pb-7">
            <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
              <span className="rounded-full bg-[#C2DCFB] p-1.5">
                <span className="block h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-[#C2DCFB] sm:h-28 sm:w-28">
                  <img
                    src={avatar}
                    alt={`${firstName} ${lastName}`}
                    className="h-full w-full object-cover"
                  />
                </span>
              </span>
              <div className="flex gap-2 pb-1">
                <Link
                  href="/create-post"
                  className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-bold text-white"
                >
                  <Plus size={16} /> Post Vibe
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setDraftBio(bio);
                    setDraftIsPrivate(user?.is_private ?? false);
                    setEditError("");
                    setEditing(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#111827]"
                >
                  <Pencil size={15} /> Edit Profile
                </button>
              </div>
            </div>

            <div className="mt-4">
              <h1 className="text-2xl font-bold">
                {firstName} {lastName}
              </h1>
              <p className="mt-0.5 text-sm font-semibold tracking-wide text-[#6B7280]">
                @{handle}
              </p>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">
                Creative Director · NYC
              </p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#262626]">
                {bio}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-4 border-t border-zinc-200 pt-4 text-center">
              {[
                { value: postCount.toLocaleString(), label: "Posts" },
                {
                  value: (followersCount || 1240).toLocaleString(),
                  label: "Followers",
                },
                {
                  value: (followingCount || 842).toLocaleString(),
                  label: "Following",
                },
                {
                  value:
                    likesCount >= 1000
                      ? `${(likesCount / 1000).toFixed(1)}k`
                      : likesCount.toLocaleString(),
                  label: "Vibes",
                },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-base font-bold text-[#111827]">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[10px] text-[#6B7280] sm:text-xs">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-200 bg-white">
          <div className="grid grid-cols-4 border-b border-zinc-200">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`min-h-12 text-[10px] font-bold tracking-wide sm:text-xs ${activeTab === tab ? "border-black text-black" : "border-transparent text-[#6B7280]"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          {loading ? (
            <p className="py-12 text-center text-sm text-[#6B7280]">
              Loading your vibes…
            </p>
          ) : visiblePosts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Camera size={23} className="mx-auto text-[#6B7280]" />
              <p className="mt-3 text-sm font-semibold">Nothing here yet</p>
              <Link
                href="/create-post"
                className="mt-3 inline-block text-sm font-semibold underline underline-offset-4"
              >
                Share your first vibe
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 p-1">
              {visiblePosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="group relative block aspect-square overflow-hidden bg-[#E5E7EB]"
                >
                  {post.images[0] && (
                    <img
                      src={post.images[0]}
                      alt={post.caption}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <span className="absolute inset-0 hidden items-center justify-center gap-3 bg-[#111827] text-sm font-bold text-white group-hover:flex">
                    <span className="inline-flex items-center gap-1">
                      <Heart size={15} fill="#FFFFFF" />
                      {post.likes}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Grid3X3 size={15} />
                      {post.comments.length}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#E5E7EB] p-4">
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!user) return;
              setSavingProfile(true);
              setEditError("");
              try {
                const updatedUser =
                  draftIsPrivate === user.is_private
                    ? user
                    : await profileService.updatePrivacy(draftIsPrivate);
                setUser(updatedUser);
                const nextBio = draftBio.trim();
                setBio(nextBio);
                localStorage.setItem("vibe.profile.bio", nextBio);
                setEditing(false);
              } catch (reason: unknown) {
                setEditError(
                  reason instanceof Error
                    ? reason.message
                    : "Could not save profile settings",
                );
              } finally {
                setSavingProfile(false);
              }
            }}
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Edit profile</h2>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-sm font-semibold text-[#6B7280]"
              >
                Cancel
              </button>
            </div>
            <label className="block text-sm font-semibold">
              Bio
              <textarea
                value={draftBio}
                onChange={(event) => setDraftBio(event.target.value)}
                maxLength={280}
                rows={4}
                className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-black"
              />
            </label>
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold">Profile visibility</legend>
              <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                Choose who can see your profile and posts.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={!draftIsPrivate}
                  onClick={() => setDraftIsPrivate(false)}
                  className={`rounded-xl border p-3 text-left transition ${!draftIsPrivate ? "border-black bg-zinc-50 ring-1 ring-black" : "border-zinc-200 hover:bg-zinc-50"}`}
                >
                  <span className="block text-sm font-bold">🌍 Public</span>
                  <span className="mt-1 block text-xs leading-5 text-[#6B7280]">
                    Anyone can see your profile and posts.
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={draftIsPrivate}
                  onClick={() => setDraftIsPrivate(true)}
                  className={`rounded-xl border p-3 text-left transition ${draftIsPrivate ? "border-black bg-zinc-50 ring-1 ring-black" : "border-zinc-200 hover:bg-zinc-50"}`}
                >
                  <span className="block text-sm font-bold">🔒 Private</span>
                  <span className="mt-1 block text-xs leading-5 text-[#6B7280]">
                    Only accepted followers can see your posts and details.
                  </span>
                </button>
              </div>
            </fieldset>
            {editError && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {editError}
              </p>
            )}
            <button
              type="submit"
              disabled={savingProfile}
              className="mt-4 w-full rounded-xl bg-black px-4 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
            >
              {savingProfile ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
