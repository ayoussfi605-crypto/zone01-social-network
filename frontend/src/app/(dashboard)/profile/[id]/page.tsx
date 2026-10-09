"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FollowersModal from "../../../../components/profile/FollowersModal";
import PrivateProfileView from "../../../../components/profile/PrivateProfileView";
import ProfileHeader from "../../../../components/profile/ProfileHeader";
import { profileService } from "../../../../services/profileService";
import { postService } from "@/src/services/postService";
import type { SocialPost } from "@/src/types/social";
import type { FollowStatus, UserProfile } from "../../../../types/profile";

type Relationship = "followers" | "following";

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<FollowStatus>("none");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const currentUser = await profileService.getCurrentUser();
        if (currentUser.id === Number(params.id)) {
          router.replace("/profile");
          return;
        }
        const result = await profileService.getProfile(params.id);
        if (!active) return;
        setProfile(result);
        setStatus(result.follow_status);
        // The backend returns only the posts this viewer may see.
        const visible = await postService.getUserPosts(result.user.id);
        if (!active) return;
        setPosts(visible);
      } catch (err: unknown) {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Could not load profile";
        setError(message);
        if (message.toLowerCase().includes("not logged in"))
          router.push("/login");
      }
    }
    void loadProfile();
    return () => {
      active = false;
    };
  }, [params.id, router]);

  if (!profile) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-center text-sm text-zinc-500">
        {error || "Loading profile…"}
      </main>
    );
  }

  const isRestricted = profile.restricted;
  return (
    <main className="min-h-screen bg-white px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link
          href="/"
          className="inline-block text-sm font-semibold text-indigo-700 hover:text-indigo-900"
        >
          ← Back to feed
        </Link>
        <ProfileHeader
          user={profile.user}
          followStatus={status}
          onFollowStatusChange={setStatus}
        />
        {!isRestricted && profile.stats && (
          <section
            aria-label="Profile relationships"
            className="grid grid-cols-2 rounded-2xl border border-zinc-200 bg-white text-center"
          >
            {[
              {
                label: "Followers",
                value: profile.stats.follower_count,
                relationship: "followers" as const,
              },
              {
                label: "Following",
                value: profile.stats.following_count,
                relationship: "following" as const,
              },
            ].map((item) => (
              <button
                key={item.relationship}
                type="button"
                onClick={() => setRelationship(item.relationship)}
                aria-label={`View ${item.value} ${item.label.toLowerCase()}`}
                className="rounded-xl px-4 py-4 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black"
              >
                <span className="block font-bold text-zinc-900">
                  {item.value.toLocaleString()}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {item.label}
                </span>
              </button>
            ))}
          </section>
        )}
        {isRestricted ? (
          <PrivateProfileView pending={status === "pending"} />
        ) : (
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <h2 className="font-bold">Socil Networks</h2>
              <span className="text-xs text-zinc-500">
                {posts.length} posts
              </span>
            </div>
            {posts.length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-500">
                No visible posts yet.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1 p-1">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="aspect-square overflow-hidden bg-[#E5E7EB]"
                  >
                    {post.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.image}
                        alt={post.caption}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center p-3 text-center text-xs text-[#262626]">
                        {post.caption}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
        {relationship && (
          <FollowersModal
            userId={profile.user.id}
            relationship={relationship}
            onClose={() => setRelationship(null)}
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
