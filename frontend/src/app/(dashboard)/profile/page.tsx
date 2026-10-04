"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProfileHeader from "../../../components/profile/ProfileHeader";
import { profileService } from "../../../services/profileService";
import type { FollowerSummary, UserProfile } from "../../../types/profile";
import type { User } from "../../../types/user";

export default function MyProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<FollowerSummary[]>([]);
  const [error, setError] = useState("");
  const [busyID, setBusyID] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const currentUser = await profileService.getCurrentUser();
        const [ownProfile, pendingRequests] = await Promise.all([
          profileService.getProfile(currentUser.id),
          profileService.getPendingRequests(),
        ]);
        if (active) {
          setProfile(ownProfile);
          setRequests(pendingRequests);
        }
      } catch (err: unknown) {
        if (active) {
          const message =
            err instanceof Error ? err.message : "Could not load your profile";
          setError(message);
          if (message.toLowerCase().includes("not logged in"))
            router.push("/login");
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [router]);

  async function respond(followerID: number, accept: boolean) {
    setBusyID(followerID);
    setError("");
    try {
      await profileService.respondToFollowRequest(followerID, accept);
      setRequests((current) =>
        current.filter((user) => user.id !== followerID),
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not respond to follow request",
      );
    } finally {
      setBusyID(null);
    }
  }

  function updateUser(user: User) {
    setProfile((current) => (current ? { ...current, user } : current));
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-center text-sm text-zinc-500">
        {error || "Loading profile…"}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href="/feed"
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
          >
            ← Back to feed
          </Link>
          <Link
            href={`/profile/${profile.user.id}`}
            className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
          >
            View public profile
          </Link>
        </div>
        <ProfileHeader
          user={profile.user}
          isOwner
          followStatus={profile.follow_status}
          onUserChange={updateUser}
          onFollowStatusChange={() => undefined}
        />
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <section className="rounded-3xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-bold text-zinc-900">Follow requests</h2>
          {requests.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">
              No pending follow requests.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {requests.map((request) => (
                <li
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <Link
                    href={`/profile/${request.id}`}
                    className="font-semibold text-zinc-800 hover:text-indigo-700"
                  >
                    {request.first_name} {request.last_name}
                  </Link>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyID === request.id}
                      onClick={() => void respond(request.id, true)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={busyID === request.id}
                      onClick={() => void respond(request.id, false)}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700 disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-3xl border-2 border-dashed border-zinc-200 bg-white p-10 text-center">
          <div className="text-3xl">📝</div>
          <h2 className="mt-2 font-bold text-zinc-800">Your activity</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Posts and activity will appear here when the posts feature is
            connected.
          </p>
        </section>
      </div>
    </main>
  );
}
