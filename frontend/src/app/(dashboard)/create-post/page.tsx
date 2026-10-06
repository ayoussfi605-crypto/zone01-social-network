/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Eye,
  FileText,
  Globe,
  Hash,
  Heart,
  ImagePlus,
  Lock,
  MapPin,
  MessageCircle,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { profileService } from "@/src/services/profileService";
import type { FollowerSummary } from "@/src/types/profile";
import { postService } from "@/src/services/postService";
import {
  loadSocialDrafts,
  newSocialID,
  saveSocialDrafts,
  SELF,
  type SocialDraft,
} from "@/src/utils/socialPosts";
import type { PostPrivacy, SocialPost, SocialPerson } from "@/src/types/social";

const imageChoices = [
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=720&q=85",
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=720&q=85",
  "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=720&q=85",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=720&q=85",
];

const locations = [
  "Brooklyn, New York",
  "Manhattan, New York",
  "San Francisco, California",
  "London, United Kingdom",
];

const categories = ["Minimalism", "VibeWeb", "DigitalZen"] as const;

const privacyOptions = [
  {
    id: "public",
    label: "Public",
    detail: "Anyone on VIBE can see this post.",
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

function timeAgo(value: string) {
  const elapsed = Date.now() - Date.parse(value);
  if (Number.isNaN(elapsed)) return "";
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function CreatePostPage() {
  const router = useRouter();
  const [caption, setCaption] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<Record<string, File>>({});
  const [location, setLocation] = useState("");
  const [privacy, setPrivacy] = useState<PostPrivacy>("public");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [followers, setFollowers] = useState<FollowerSummary[]>([]);
  const [selectedAudience, setSelectedAudience] = useState<number[]>([]);
  const [author, setAuthor] = useState<SocialPerson>(SELF);
  const [showLocations, setShowLocations] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [drafts, setDrafts] = useState<SocialDraft[]>([]);
  const [recentPosts, setRecentPosts] = useState<SocialPost[]>([]);
  const [activeDraftID, setActiveDraftID] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadWorkspace() {
      try {
        const currentUser = await profileService.getCurrentUser();
        const ownFollowers = await profileService.getFollowers(currentUser.id);
        if (!active) return;
        setFollowers(ownFollowers);
        setAuthor({
          id: currentUser.id,
          name: `${currentUser.first_name} ${currentUser.last_name}`,
          handle: `@${currentUser.nickname || `${currentUser.first_name}${currentUser.last_name}`.replace(/\s+/g, "").toLowerCase()}`,
          avatar: currentUser.avatar_path
            ? profileService.avatarURL(currentUser.avatar_path)
            : SELF.avatar,
        });
        const ownPosts = await postService.getUserPosts(currentUser.id);
        if (!active) return;
        setRecentPosts(ownPosts.slice(0, 4));
      } catch {
        // The composer stays usable with the local preview identity.
      }
      if (active) setDrafts(loadSocialDrafts());
    }
    void loadWorkspace();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const activePrivacy =
    privacyOptions.find((option) => option.id === privacy) ?? privacyOptions[0];
  const hasContent = Boolean(
    caption.trim() || images.length || location || tags.length || category,
  );
  const canPublish =
    (caption.trim().length > 0 || images.length > 0) &&
    (privacy !== "private" || selectedAudience.length > 0);

  function toggleImage(image: string) {
    setImages((current) =>
      current.includes(image)
        ? current.filter((item) => item !== image)
        : [...current, image].slice(0, 4),
    );
    setImageFiles((files) => {
      if (!(image in files)) return files;
      const next = { ...files };
      delete next[image];
      return next;
    });
  }

  function addPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) {
      setError("Choose an image or GIF under 5MB.");
      event.target.value = "";
      return;
    }
    const preview = URL.createObjectURL(file);
    setImages((current) => [...current, preview].slice(0, 4));
    setImageFiles((current) => ({ ...current, [preview]: file }));
    setError("");
    event.target.value = "";
  }

  function addTag(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = tagDraft.trim().replace(/^#/, "").replace(/\s+/g, "");
    if (!value) return;
    setTags((current) =>
      current.includes(value) ? current : [...current, value].slice(0, 6),
    );
    setTagDraft("");
  }

  function draftSnapshot(id: string): SocialDraft {
    return {
      id,
      caption: caption.trim(),
      images,
      location,
      privacy,
      audienceIDs: privacy === "private" ? selectedAudience : [],
      category,
      tags,
      updatedAt: new Date().toISOString(),
    };
  }

  function saveDraft() {
    if (!hasContent) {
      setError("Add a caption, photo, tag, or location before saving a draft.");
      return;
    }
    const id = activeDraftID ?? newSocialID("draft");
    const next = [
      draftSnapshot(id),
      ...loadSocialDrafts().filter((draft) => draft.id !== id),
    ].slice(0, 8);
    saveSocialDrafts(next);
    setDrafts(next);
    setActiveDraftID(id);
    setError("");
    setNotice("Draft saved.");
  }

  function restoreDraft(draft: SocialDraft) {
    setCaption(draft.caption);
    setImages(draft.images);
    setLocation(draft.location);
    setPrivacy(draft.privacy);
    setSelectedAudience(draft.audienceIDs);
    setCategory(draft.category);
    setTags(draft.tags);
    setActiveDraftID(draft.id);
    setError("");
    setNotice("Draft restored.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteDraft(id: string) {
    const next = loadSocialDrafts().filter((draft) => draft.id !== id);
    saveSocialDrafts(next);
    setDrafts(next);
    if (activeDraftID === id) setActiveDraftID(null);
  }

  async function publishPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPublish) return;
    setPublishing(true);
    setError("");
    const primary = images[0] ?? "";
    const file = imageFiles[primary] ?? null;
    const imageUrl =
      !file && /^https?:\/\//.test(primary) ? primary : undefined;
    try {
      const newID = await postService.createPost({
        content: caption.trim(),
        privacy,
        allowedUserIDs: privacy === "private" ? selectedAudience : [],
        image: file,
        imageUrl,
      });
      if (activeDraftID) {
        saveSocialDrafts(
          loadSocialDrafts().filter((draft) => draft.id !== activeDraftID),
        );
      }
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
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link
            href="/"
            aria-label="Cancel post"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-700"
          >
            <ArrowLeft size={21} />
          </Link>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-base font-bold">Create post</h1>
            <p className="truncate text-[11px] text-zinc-500">
              Compose, preview, publish
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={saveDraft}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-2 text-sm font-bold text-[#111827]"
            >
              <FileText size={15} />
              <span className="hidden sm:inline">Save draft</span>
            </button>
            <button
              type="submit"
              form="create-post-form"
              disabled={publishing || !canPublish}
              className="rounded-full bg-[#C2DCFB] px-4 py-2 text-sm font-bold text-[#111827] disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
            >
              {publishing ? "Posting…" : "Publish"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form
          id="create-post-form"
          onSubmit={(event) => void publishPost(event)}
          className="space-y-5"
        >
          {notice && (
            <p
              role="status"
              className="rounded-xl bg-[#C2DCFB] p-3 text-sm font-semibold text-[#111827]"
            >
              {notice}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-[#F3F4F6] p-3 text-sm text-[#262626]"
            >
              {error}
            </p>
          )}

          <section className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
            <img
              src={author.avatar}
              alt=""
              className="h-11 w-11 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{author.name}</p>
              <p className="truncate text-xs text-zinc-500">
                {activePrivacy.detail}
              </p>
            </div>
            <span className="hidden shrink-0 rounded-full bg-[#F3F4F6] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B7280] sm:inline-flex">
              Workspace
            </span>
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
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Attachments</h2>
              <span className="text-[11px] text-zinc-500">
                {images.length}/4 photos
              </span>
            </div>

            {images.length > 0 && (
              <div
                className={`mt-4 grid gap-2 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
              >
                {images.map((image) => (
                  <div
                    key={image}
                    className="relative overflow-hidden rounded-xl bg-[#E5E7EB]"
                  >
                    <img
                      src={image}
                      alt="Selected attachment"
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => toggleImage(image)}
                      aria-label="Remove attachment"
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-[#F3F4F6] p-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#C2DCFB] px-3 py-2 text-xs font-bold text-[#111827]">
                <ImagePlus size={15} /> Upload
                <input
                  type="file"
                  accept="image/*"
                  onChange={addPhoto}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                aria-pressed={showTagInput}
                onClick={() => setShowTagInput((current) => !current)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold ${
                  showTagInput
                    ? "border-black bg-white text-[#111827]"
                    : "border-zinc-200 bg-white text-[#262626]"
                }`}
              >
                <Hash size={14} /> Tag
              </button>
              <button
                type="button"
                aria-pressed={showLocations}
                onClick={() => setShowLocations((current) => !current)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold ${
                  showLocations
                    ? "border-black bg-white text-[#111827]"
                    : "border-zinc-200 bg-white text-[#262626]"
                }`}
              >
                <MapPin size={14} /> Location
              </button>
              <span className="ml-auto text-[10px] font-semibold text-[#6B7280]">
                Tap a badge to remove
              </span>
            </div>

            {(location || tags.length > 0 || category) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {location && (
                  <button
                    type="button"
                    onClick={() => setLocation("")}
                    aria-label={`Remove location ${location}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-3 py-1.5 text-xs font-semibold text-[#262626]"
                  >
                    <MapPin size={13} /> {location}
                    <X size={12} />
                  </button>
                )}
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setTags((current) => current.filter((item) => item !== tag))
                    }
                    aria-label={`Remove tag ${tag}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-3 py-1.5 text-xs font-semibold text-[#262626]"
                  >
                    #{tag}
                    <X size={12} />
                  </button>
                ))}
                {category && (
                  <button
                    type="button"
                    onClick={() => setCategory("")}
                    aria-label={`Remove category ${category}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#C2DCFB] px-3 py-1.5 text-xs font-bold text-[#111827]"
                  >
                    #{category}
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {showTagInput && (
              <form onSubmit={addTag} className="mt-3 flex gap-2">
                <input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  placeholder="#vibes"
                  maxLength={24}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-black"
                />
                <button
                  type="submit"
                  disabled={!tagDraft.trim()}
                  className="rounded-lg bg-black px-3 py-2 text-xs font-bold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                >
                  Add tag
                </button>
              </form>
            )}

            {showLocations && (
              <div className="mt-3 grid gap-1 rounded-xl border border-zinc-200 p-2">
                {locations.map((place) => (
                  <button
                    key={place}
                    type="button"
                    onClick={() => {
                      setLocation(place);
                      setShowLocations(false);
                    }}
                    className="rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-[#F3F4F6]"
                  >
                    {place}
                  </button>
                ))}
                {location && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocation("");
                      setShowLocations(false);
                    }}
                    className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#6B7280] hover:bg-[#F3F4F6]"
                  >
                    Clear location
                  </button>
                )}
              </div>
            )}

            <div className="mt-4 border-t border-zinc-200 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">
                Quick picks
              </h3>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {imageChoices.map((image, index) => {
                  const selected = images.includes(image);
                  return (
                    <button
                      key={image}
                      type="button"
                      onClick={() => toggleImage(image)}
                      aria-label={`${selected ? "Remove" : "Add"} photo ${index + 1}`}
                      className={`overflow-hidden rounded-lg border-2 ${selected ? "border-black" : "border-transparent"}`}
                    >
                      <img
                        src={image}
                        alt=""
                        className="aspect-square w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
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
            <p className="mt-2 text-xs text-[#6B7280]">{activePrivacy.detail}</p>

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
                      className="flex items-center gap-2 text-sm text-[#262626]"
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
                      {follower.first_name} {follower.last_name}
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

          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-bold">Category</h2>
            <p className="mt-1 text-xs text-[#6B7280]">
              Help people find your vibe. Pick one tag.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={category === item}
                  onClick={() =>
                    setCategory((current) => (current === item ? "" : item))
                  }
                  className={`rounded-full border px-3.5 py-2 text-xs font-bold ${
                    category === item
                      ? "border-black bg-black text-white"
                      : "border-zinc-200 bg-white text-[#262626]"
                  }`}
                >
                  #{item}
                </button>
              ))}
            </div>
          </section>

          <div className="flex justify-end sm:hidden">
            <button
              type="button"
              onClick={saveDraft}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-4 py-2.5 text-sm font-bold text-[#111827]"
            >
              <FileText size={15} /> Save draft
            </button>
          </div>
        </form>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-1">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Live preview</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#6B7280]">
                <Eye size={13} /> Updates live
              </span>
            </div>
            <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="flex items-center gap-3 px-3 py-3">
                <img
                  src={author.avatar}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{author.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {location ? location : author.handle} · now
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[10px] font-bold text-[#6B7280]">
                  {activePrivacy.label}
                </span>
              </div>

              {images[0] ? (
                <img
                  src={images[0]}
                  alt={caption || "Post preview"}
                  className="aspect-[4/4.4] w-full bg-[#E5E7EB] object-cover"
                />
              ) : (
                <div className="flex aspect-[4/4.4] flex-col items-center justify-center gap-2 bg-[#F3F4F6] px-6 text-center text-xs font-semibold text-[#6B7280]">
                  <ImagePlus size={18} />
                  Add a photo to see the media preview
                </div>
              )}

              <div className="px-3 pb-4 pt-3">
                <div className="flex items-center gap-4 text-[#262626]">
                  <Heart size={20} />
                  <MessageCircle size={20} />
                </div>
                <p className="mt-2 text-sm font-bold">0 likes</p>
                {caption.trim() ? (
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-[#262626]">
                    <span className="mr-1 font-bold">{author.handle}</span>
                    {caption.trim()}
                  </p>
                ) : (
                  <p className="mt-1 text-sm italic text-zinc-400">
                    Your caption will appear here…
                  </p>
                )}
                {(category || tags.length > 0 || location) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {category && (
                      <span className="rounded-full bg-[#C2DCFB] px-2.5 py-1 text-[10px] font-bold text-[#111827]">
                        #{category}
                      </span>
                    )}
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[10px] font-semibold text-[#6B7280]"
                      >
                        #{tag}
                      </span>
                    ))}
                    {location && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[10px] font-semibold text-[#6B7280]">
                        <MapPin size={11} /> {location}
                      </span>
                    )}
                  </div>
                )}
                {images.length > 1 && (
                  <p className="mt-2 text-xs text-zinc-500">
                    +{images.length - 1} more photo
                    {images.length - 1 === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-sm font-bold">
                <FileText size={15} /> Drafts
              </h2>
              <span className="text-xs text-zinc-500">{drafts.length}</span>
            </div>
            {drafts.length === 0 ? (
              <p className="mt-3 rounded-xl bg-[#F3F4F6] p-3 text-xs text-[#6B7280]">
                Save a draft to keep working on it later.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-200">
                {drafts.map((draft) => (
                  <li
                    key={draft.id}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#E5E7EB] text-[#6B7280]">
                      {draft.images[0] ? (
                        <img
                          src={draft.images[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <FileText size={16} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#111827]">
                        {draft.caption || "Untitled draft"}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#6B7280]">
                        <Clock size={11} /> {timeAgo(draft.updatedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => restoreDraft(draft)}
                        className="rounded-full bg-black px-2.5 py-1.5 text-[10px] font-bold text-white"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDraft(draft.id)}
                        aria-label="Delete draft"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-[#6B7280]"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Recent posts</h2>
              <Link
                href="/profile"
                className="text-xs font-semibold text-[#6B7280]"
              >
                Manage
              </Link>
            </div>
            {recentPosts.length === 0 ? (
              <p className="mt-3 rounded-xl bg-[#F3F4F6] p-3 text-xs text-[#6B7280]">
                Your published posts will show up here.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-200">
                {recentPosts.map((post) => (
                  <li
                    key={post.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#E5E7EB]">
                      {post.images[0] && (
                        <img
                          src={post.images[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#111827]">
                        {post.caption || "Photo post"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#6B7280]">
                        {post.likes} likes · {post.comments.length} comments
                      </p>
                    </div>
                    <Link
                      href={`/posts/${post.id}`}
                      className="shrink-0 text-xs font-semibold text-[#111827] underline underline-offset-2"
                    >
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
