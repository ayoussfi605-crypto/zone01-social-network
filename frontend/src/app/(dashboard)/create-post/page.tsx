/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  ImagePlus,
  Lock,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { isUnauthorized, profileService } from "@/src/services/profileService";
import type { FollowerSummary } from "@/src/types/profile";
import { postService } from "@/src/services/postService";
import type { PostPrivacy } from "@/src/types/social";

const privacyOptions = [
  {
    id: "public",
    label: "Public",
    detail: "Anyone on Social Network can see this post.",
    Icon: Globe,
  },
  {
    id: "almost_private",
    label: "Followers only",
    detail: "Only people who follow you can see this post.",
    Icon: Users,
  },
  {
    id: "private",
    label: "Private",
    detail: "Only the followers you pick can see this post.",
    Icon: Lock,
  },
] as const satisfies ReadonlyArray<{
  id: PostPrivacy;
  label: string;
  detail: string;
  Icon: typeof Globe;
}>;

type Author = { name: string; avatar: string };

export default function CreatePostPage() {
  const router = useRouter();
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState<{ file: File; preview: string } | null>(
    null,
  );
  const [privacy, setPrivacy] = useState<PostPrivacy>("public");
  const [followers, setFollowers] = useState<FollowerSummary[]>([]);
  const [selectedAudience, setSelectedAudience] = useState<number[]>([]);
  const [author, setAuthor] = useState<Author | null>(null);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadAuthor() {
      try {
        const currentUser = await profileService.getCurrentUser();
        if (!active) return;
        setAuthor({
          name:
            `${currentUser.first_name} ${currentUser.last_name}`.trim() ||
            currentUser.nickname ||
            "",
          avatar: currentUser.avatar_path
            ? profileService.avatarURL(currentUser.avatar_path)
            : "",
        });
        const ownFollowers = await profileService.getFollowers(currentUser.id);
        if (active) setFollowers(ownFollowers);
      } catch (reason: unknown) {
        if (!active) return;
        if (isUnauthorized(reason)) {
          router.replace("/login");
          return;
        }
        setError("Could not load your profile.");
      }
    }
    void loadAuthor();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!image) return;
    return () => URL.revokeObjectURL(image.preview);
  }, [image]);

  const activePrivacy =
    privacyOptions.find((option) => option.id === privacy) ?? privacyOptions[0];
  const canPublish =
    (caption.trim().length > 0 || image !== null) &&
    (privacy !== "private" || selectedAudience.length > 0);

  function addPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image under 5 MB.");
      return;
    }
    setImage({ file, preview: URL.createObjectURL(file) });
    setError("");
  }

  async function publishPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPublish) return;
    setPublishing(true);
    setError("");
    try {
      const newID = await postService.createPost({
        content: caption.trim(),
        privacy,
        allowedUserIDs: privacy === "private" ? selectedAudience : [],
        image: image?.file ?? null,
      });
      router.push(`/posts/${newID}`);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not publish this post. Try a smaller image.",
      );
      setPublishing(false);
    }
  }

  return (
    <main className="min-h-screen bg-white pb-24 text-zinc-900 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white session-actions-gap">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-3 px-4">
          <Link
            href="/"
            aria-label="Cancel post"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-700"
          >
            <ArrowLeft size={21} />
          </Link>
          <h1 className="truncate text-base font-bold">Create post</h1>
          <button
            type="submit"
            form="create-post-form"
            disabled={publishing || !canPublish}
            className="shrink-0 rounded-full bg-[#C2DCFB] px-4 py-2 text-sm font-bold text-[#111827] disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
          >
            {publishing ? "Posting…" : "Publish"}
          </button>
        </div>
      </header>

      <form
        id="create-post-form"
        onSubmit={(event) => void publishPost(event)}
        className="mx-auto max-w-2xl space-y-5 px-4 py-6"
      >
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-[#F3F4F6] p-3 text-sm text-[#262626]"
          >
            {error}
          </p>
        )}

        <section className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#C2DCFB] text-[#4B5563]">
            {author?.avatar ? (
              <img
                src={author.avatar}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <UserRound size={22} aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            {author ? (
              <p className="truncate text-sm font-bold">{author.name}</p>
            ) : (
              <span className="block h-4 w-32 animate-pulse rounded bg-[#E5E7EB]" />
            )}
            <p className="truncate text-xs text-zinc-500">
              {activePrivacy.detail}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Caption</h2>
            <span className="text-[11px] text-zinc-500">
              {caption.length}/2000
            </span>
          </div>
          <label className="mt-3 block">
            <span className="sr-only">What&apos;s on your mind?</span>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="What's on your mind?"
              rows={6}
              maxLength={2000}
              className="w-full resize-none border-0 bg-white text-lg leading-7 text-[#262626] outline-none placeholder:text-zinc-500"
            />
          </label>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-bold">Photo</h2>

          {image ? (
            <div className="relative mt-4 overflow-hidden rounded-xl bg-[#E5E7EB]">
              <img
                src={image.preview}
                alt="Selected attachment"
                className="max-h-[60dvh] w-full object-contain"
              />
              <button
                type="button"
                onClick={() => setImage(null)}
                aria-label="Remove photo"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#C2DCFB] px-3 py-2 text-xs font-bold text-[#111827]">
              <ImagePlus size={15} /> Upload image or GIF
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={addPhoto}
                className="sr-only"
              />
            </label>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-bold">Who can see this?</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {privacyOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={privacy === option.id}
                onClick={() => setPrivacy(option.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold ${
                  privacy === option.id
                    ? "border-black bg-[#C2DCFB] text-[#111827]"
                    : "border-zinc-200 bg-white text-[#262626]"
                }`}
              >
                <option.Icon size={14} /> {option.label}
              </button>
            ))}
          </div>

          {privacy === "private" && (
            <div className="mt-3 max-h-40 space-y-2 overflow-y-auto rounded-xl border border-zinc-200 p-3">
              {followers.length === 0 ? (
                <p className="text-xs text-[#6B7280]">
                  No followers are available to select yet.
                </p>
              ) : (
                followers.map((follower) => (
                  <label
                    key={follower.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg p-1.5 text-sm text-[#262626] hover:bg-[#F3F4F6]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAudience.includes(follower.id)}
                      onChange={() =>
                        setSelectedAudience((current) =>
                          current.includes(follower.id)
                            ? current.filter((id) => id !== follower.id)
                            : [...current, follower.id],
                        )
                      }
                      className="accent-black"
                    />
                    <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[#C2DCFB]">
                      {follower.avatar_path ? (
                        <img
                          src={profileService.avatarURL(follower.avatar_path)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[#4B5563]">
                          <UserRound size={14} />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold">{follower.first_name} {follower.last_name}</span>
                      {follower.nickname && (
                        <span className="ml-1 text-xs text-[#6B7280]">(@{follower.nickname})</span>
                      )}
                    </span>
                  </label>
                ))
              )}
              {selectedAudience.length === 0 && followers.length > 0 && (
                <p className="pt-1 text-[11px] font-semibold text-[#6B7280]">
                  Pick at least one follower to publish a private post.
                </p>
              )}
            </div>
          )}
        </section>
      </form>
    </main>
  );
}
