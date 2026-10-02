"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PrivateProfileView from "../../../../components/profile/PrivateProfileView";
import ProfileHeader from "../../../../components/profile/ProfileHeader";
import { profileService } from "../../../../services/profileService";
import type { FollowStatus, UserProfile } from "../../../../types/profile";

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<FollowStatus>("none");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    profileService.getProfile(params.id)
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setStatus(result.follow_status);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Could not load profile";
        setError(message);
        if (message.toLowerCase().includes("not logged in")) router.push("/login");
      });
    return () => { active = false; };
  }, [params.id, router]);

  if (!profile) {
    return <main className="mx-auto max-w-4xl px-4 py-12 text-center text-sm text-zinc-500">{error || "Loading profile…"}</main>;
  }

  const isRestricted = profile.restricted;
  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link href="/feed" className="inline-block text-sm font-semibold text-indigo-700 hover:text-indigo-900">← Back to feed</Link>
        <ProfileHeader
          user={profile.user}
          isOwner={false}
          followStatus={status}
          onUserChange={() => undefined}
          onFollowStatusChange={setStatus}
        />
        {isRestricted ? (
          <PrivateProfileView pending={status === "pending"} />
        ) : (
          <section className="rounded-3xl border-2 border-dashed border-zinc-200 bg-white/70 p-10 text-center">
            <div className="text-3xl">📝</div>
            <h2 className="mt-2 font-bold text-zinc-800">Profile activity</h2>
            <p className="mt-1 text-sm text-zinc-500">Posts and activity will appear here when the posts feature is connected.</p>
          </section>
        )}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    </main>
  );
}
