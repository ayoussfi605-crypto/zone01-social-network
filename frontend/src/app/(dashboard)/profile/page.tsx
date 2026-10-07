"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Camera, Grid3X3, Heart, Pencil, Plus, UserRound } from "lucide-react";
import { profileService } from "@/src/services/profileService";
import { postService } from "@/src/services/postService";
import FollowersModal from "@/src/components/profile/FollowersModal";
import type { SocialPost } from "@/src/types/social";
import type { User } from "@/src/types/user";

type Relationship = "followers" | "following";

export default function MyProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    post_count: 0,
    follower_count: 0,
    following_count: 0,
  });
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [bio, setBio] = useState("");
  const [draftBio, setDraftBio] = useState("");
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
        const profile = await profileService.getProfile(currentUser.id);
        if (!active) return;
        setUser(currentUser);
        setStats({
          post_count: profile.stats?.post_count ?? 0,
          follower_count: profile.stats?.follower_count ?? 0,
          following_count: profile.stats?.following_count ?? 0,
        });
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

  const firstName = user?.first_name ?? "";
  const lastName = user?.last_name ?? "";
  const handle = user?.nickname ?? "";

  const avatar = user?.avatar_path
    ? profileService.avatarURL(user.avatar_path)
    : "";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-5 text-center text-sm font-semibold text-[#6B7280]">
        Loading profile…
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-5 text-center">
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error || "Could not load your profile."}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-24 text-[#111827]">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-black tracking-[0.18em]">
            Socil Network
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
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="h-28 bg-[#C2DCFB] sm:h-36" />
          <div className="px-5 pb-5 sm:px-8 sm:pb-7">
            <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
              <span className="rounded-full bg-[#C2DCFB] p-1.5">
                <span className="block flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#C2DCFB] text-[#4B5563] sm:h-28 sm:w-28">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={`${firstName} ${lastName}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound className="h-12 w-12" aria-label="User avatar" />
                  )}
                </span>
              </span>
              <div className="flex gap-2 pb-1">
                <Link
                  href="/create-post"
                  className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-bold text-white"
                >
                  <Plus size={16} /> Post Socil Network
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
              <p className="mt-1 text-sm font-medium text-indigo-600">
                @{handle ? handle.replace(/^@/, "") : "vibeuser"}
              </p>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">
                {user.is_private ? "🔒 Private profile" : "🌍 Public profile"}
              </p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#262626]">
                {bio}
              </p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold text-[#6B7280]">
                    Email
                  </dt>
                  <dd className="mt-1 break-words">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-[#6B7280]">
                    Date of birth
                  </dt>
                  <dd className="mt-1">
                    <time dateTime={user.dob}>{user.dob}</time>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 grid grid-cols-3 border-t border-zinc-200 pt-4 text-center">
              {[
                { value: stats.post_count.toLocaleString(), label: "Posts" },
                {
                  value: stats.follower_count.toLocaleString(),
                  label: "Followers",
                  relationship: "followers" as const,
                },
                {
                  value: stats.following_count.toLocaleString(),
                  label: "Following",
                  relationship: "following" as const,
                },
              ].map((stat) => (
                <div key={stat.label}>
                  {stat.relationship ? (
                    <button
                      type="button"
                      onClick={() => setRelationship(stat.relationship)}
                      className="w-full rounded-lg text-left hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                      aria-label={`Open ${stat.label} list`}
                    >
                      <p className="text-base font-bold text-[#111827]">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-[10px] text-[#6B7280] sm:text-xs">
                        {stat.label}
                      </p>
                    </button>
                  ) : (
                    <>
                      <p className="text-base font-bold text-[#111827]">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-[10px] text-[#6B7280] sm:text-xs">
                        {stat.label}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-200 bg-white">
          <div className="flex min-h-12 items-center px-4 text-[10px] font-bold tracking-wide sm:text-xs">
            MY Socil NetworkS
          </div>
          {ownPosts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Camera size={23} className="mx-auto text-[#6B7280]" />
              <p className="mt-3 text-sm font-semibold">Nothing here yet</p>
              <Link
                href="/create-post"
                className="mt-3 inline-block text-sm font-semibold underline underline-offset-4"
              >
                Share your first Socil Network
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 p-1">
              {ownPosts.map((post) => (
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

      {relationship && user.id > 0 && (
        <FollowersModal
          userId={user.id}
          relationship={relationship}
          onClose={() => setRelationship(null)}
        />
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#E5E7EB] p-4">
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!user) return;
              setSavingProfile(true);
              setEditError("");
              try {
                const nextBio = draftBio.trim();
                const updatedUser = await profileService.updateProfile(
                  nextBio,
                  draftIsPrivate,
                );
                setUser(updatedUser);
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
              <legend className="text-sm font-semibold">
                Profile visibility
              </legend>
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
