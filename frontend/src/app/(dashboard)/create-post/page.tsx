"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, MapPin, X } from "lucide-react";
import { useEffect, useState } from "react";
import { profileService } from "@/src/services/profileService";
import type { FollowerSummary } from "@/src/types/profile";
import {
  newSocialID,
  loadSocialPosts,
  saveSocialPosts,
  SELF,
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

export default function CreatePostPage() {
  const router = useRouter();
  const [caption, setCaption] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [privacy, setPrivacy] = useState<PostPrivacy>("public");
  const [followers, setFollowers] = useState<FollowerSummary[]>([]);
  const [selectedAudience, setSelectedAudience] = useState<number[]>([]);
  const [author, setAuthor] = useState<SocialPerson>(SELF);
  const [showLocations, setShowLocations] = useState(false);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadAudience() {
      try {
        const currentUser = await profileService.getCurrentUser();
        const ownFollowers = await profileService.getFollowers(currentUser.id);
        if (!active) return;
        setFollowers(ownFollowers);
        setAuthor({
          id: currentUser.id,
          name: `${currentUser.first_name} ${currentUser.last_name}`,
          handle: `@${currentUser.nickname || `${currentUser.first_name}${currentUser.last_name}`.replace(/\s+/g, "").toLowerCase()}`,
          avatar: currentUser.avatar_path ? profileService.avatarURL(currentUser.avatar_path) : SELF.avatar,
        });
      } catch {
        // The composer remains usable with the local preview identity.
      }
    }
    void loadAudience();
    return () => {
      active = false;
    };
  }, []);

  function toggleImage(image: string) {
    setImages((current) =>
      current.includes(image)
        ? current.filter((item) => item !== image)
        : [...current, image].slice(0, 4),
    );
  }

  function addPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 700_000) {
      setError("Choose an image under 700 KB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImages((current) =>
          [...current, reader.result as string].slice(0, 4),
        );
        setError("");
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function publishPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!caption.trim() && images.length === 0) || (privacy === "private" && selectedAudience.length === 0)) return;
    setPublishing(true);
    const post: SocialPost = {
      id: newSocialID("post"),
      author,
      caption: caption.trim(),
      images,
      location,
      privacy,
      audienceIDs: privacy === "private" ? selectedAudience : [],
      createdAt: new Date().toISOString(),
      likes: 0,
      liked: false,
      comments: [],
    };
    try {
      saveSocialPosts([post, ...loadSocialPosts()]);
      router.push(`/posts/${post.id}`);
    } catch {
      setError("Could not save this post. Try a smaller image.");
      setPublishing(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto min-h-screen max-w-xl bg-white">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4">
          <Link
            href="/"
            aria-label="Cancel post"
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-700"
          >
            <ArrowLeft size={21} />
          </Link>
          <h1 className="text-base font-bold">New post</h1>
          <button
            type="submit"
            form="create-post-form"
            disabled={publishing || (!caption.trim() && images.length === 0) || (privacy === "private" && selectedAudience.length === 0)}
            className="rounded-full bg-[#C2DCFB] px-4 py-2 text-sm font-bold text-[#111827] disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
          >
            {publishing ? "Posting…" : "Post"}
          </button>
        </header>

        <form
          id="create-post-form"
          onSubmit={(event) => void publishPost(event)}
          className="space-y-5 px-4 py-5"
        >
          <div className="flex items-center gap-3">
            <img
              src={SELF.avatar}
              alt=""
              className="h-11 w-11 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-bold">{author.name}</p>
              <p className="text-xs text-zinc-500">Sharing with everyone</p>
            </div>
          </div>

          <label className="block">
            <span className="sr-only">What&apos;s on your mind?</span>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="What's on your mind?"
              rows={5}
              maxLength={2000}
              className="w-full resize-none border-0 bg-white text-lg leading-7 text-[#262626] outline-none placeholder:text-zinc-500"
            />
          </label>

          <fieldset className="rounded-2xl border border-zinc-200 p-3">
            <legend className="px-1 text-sm font-bold text-[#111827]">Who can see this?</legend>
            <div className="mt-1 grid gap-2 sm:grid-cols-3">
              {([
                { id: "public", label: "Public", detail: "Everyone" },
                { id: "almost_private", label: "Followers", detail: "People who follow you" },
                { id: "private", label: "Selected", detail: "Choose followers" },
              ] as const).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={privacy === option.id}
                  onClick={() => setPrivacy(option.id)}
                  className={`rounded-xl border px-3 py-2 text-left ${privacy === option.id ? "border-black bg-[#C2DCFB]" : "border-zinc-200 bg-white"}`}
                >
                  <span className="block text-xs font-bold text-[#111827]">{option.label}</span>
                  <span className="mt-0.5 block text-[10px] text-[#6B7280]">{option.detail}</span>
                </button>
              ))}
            </div>
            {privacy === "private" && (
              <div className="mt-3 max-h-36 space-y-2 overflow-y-auto border-t border-zinc-200 pt-3">
                {followers.length === 0 ? (
                  <p className="text-xs text-[#6B7280]">No followers are available to select yet.</p>
                ) : followers.map((follower) => (
                  <label key={follower.id} className="flex items-center gap-2 text-sm text-[#262626]">
                    <input
                      type="checkbox"
                      checked={selectedAudience.includes(follower.id)}
                      onChange={() => setSelectedAudience((current) => current.includes(follower.id) ? current.filter((id) => id !== follower.id) : [...current, follower.id])}
                      className="accent-black"
                    />
                    {follower.first_name} {follower.last_name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {images.length > 0 && (
            <div
              className={`grid gap-2 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
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
                    aria-label="Remove image"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <section
            aria-labelledby="media-picker-title"
            className="rounded-2xl border border-zinc-200 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 id="media-picker-title" className="text-sm font-bold">
                Add to your post
              </h2>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#C2DCFB] px-3 py-1.5 text-xs font-semibold text-[#111827]">
                <ImagePlus size={15} /> Upload
                <input
                  type="file"
                  accept="image/*"
                  onChange={addPhoto}
                  className="sr-only"
                />
              </label>
            </div>
            <div className="grid grid-cols-4 gap-2">
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
          </section>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLocations((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700"
            >
              <MapPin size={16} /> {location || "Add location"}
            </button>
            {location && (
              <button
                type="button"
                aria-label="Remove location"
                onClick={() => setLocation("")}
                className="ml-2 rounded-full p-2 text-zinc-500"
              >
                <X size={15} />
              </button>
            )}
            {showLocations && (
              <div className="absolute left-0 top-12 z-10 w-64 rounded-xl border border-zinc-200 bg-white p-2">
                {locations.map((place) => (
                  <button
                    key={place}
                    type="button"
                    onClick={() => {
                      setLocation(place);
                      setShowLocations(false);
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-[#E5E7EB]"
                  >
                    {place}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-[#F3F4F6] p-3 text-sm text-[#262626]"
            >
              {error}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
