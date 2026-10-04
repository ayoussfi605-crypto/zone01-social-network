"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Camera, Grid3X3, Heart, Pencil, Plus } from "lucide-react";
import MobileBottomNav from "@/src/components/navigation/MobileBottomNav";
import { profileService } from "@/src/services/profileService";
import {
  loadSocialPosts,
  SELF,
  subscribeToSocialPosts,
} from "@/src/utils/socialPosts";
import type { SocialPost } from "@/src/types/social";
import type { User } from "@/src/types/user";

type ProfileTab = "MY VIBES" | "MEDIA" | "LIKES" | "TAGGED";

const tabs: ProfileTab[] = ["MY VIBES", "MEDIA", "LIKES", "TAGGED"];
const defaultBio =
  "Architecting digital experiences and chasing the perfect minimalist aesthetic. Always vibing with new ideas.";

export default function MyProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>("MY VIBES");
  const [bio, setBio] = useState(defaultBio);
  const [draftBio, setDraftBio] = useState(defaultBio);
  const [editing, setEditing] = useState(false);
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
    const refreshPosts = () => setPosts(loadSocialPosts());
    refreshPosts();
    const unsubscribe = subscribeToSocialPosts(refreshPosts);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  const visiblePosts = useMemo(() => {
    if (activeTab === "LIKES") return posts.filter((post) => post.liked);
    if (activeTab === "TAGGED")
      return posts.filter((post) => post.caption.toLowerCase().includes("@"));
    if (activeTab === "MEDIA")
      return posts.filter((post) => post.images.length > 0);
    return posts;
  }, [activeTab, posts]);

  const firstName = user?.first_name || "Jordan";
  const lastName = user?.last_name || "Carter";
  const handle = (user?.nickname || "JORDAN_VIBE")
    .replace(/^@/, "")
    .toUpperCase();
  const avatar = user?.avatar_path
    ? profileService.avatarURL(user.avatar_path)
    : SELF.avatar;
  const postCount = posts.length || 12;
  const likesCount = 15400;

  return (
    <main className="min-h-screen bg-zinc-100 pb-24 text-[#111827]">
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
                className={`min-h-12 border-b-2 text-[10px] font-bold tracking-wide sm:text-xs ${activeTab === tab ? "border-black text-black" : "border-transparent text-[#6B7280]"}`}
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

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">People to know</h2>
            <Link
              href="/followers"
              className="text-xs font-semibold text-[#6B7280]"
            >
              Explore
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                name: "Amara Okafor",
                handle: "@amaraokafor",
                color: "bg-[#F3F4F6]",
                avatar:
                  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=85",
              },
              {
                name: "Theo Martin",
                handle: "@theomartin",
                color: "bg-[#C2DCFB]",
                avatar:
                  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=85",
              },
            ].map((person) => (
              <article
                key={person.handle}
                className={`flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 ${person.color}`}
              >
                <img
                  src={person.avatar}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{person.name}</p>
                  <p className="truncate text-xs text-[#6B7280]">
                    {person.handle}
                  </p>
                </div>
                <Link
                  href="/followers"
                  className="rounded-full bg-black px-3 py-1.5 text-xs font-bold text-white"
                >
                  Follow
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#E5E7EB] p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setBio(draftBio.trim());
              localStorage.setItem("vibe.profile.bio", draftBio.trim());
              setEditing(false);
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
            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-black px-4 py-3 text-sm font-bold text-white"
            >
              Save changes
            </button>
          </form>
        </div>
      )}
      <MobileBottomNav active="profile" />
    </main>
  );
}
