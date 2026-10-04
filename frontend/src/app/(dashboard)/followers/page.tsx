/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import MobileBottomNav from "@/src/components/navigation/MobileBottomNav";
import { useWebSocket } from "@/src/context/WebSocketConetext";
import { profileService } from "@/src/services/profileService";
import type { FollowStatus, FollowerSummary } from "@/src/types/profile";

type Relationship = "followers" | "following";

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? "?"}${lastName[0] ?? ""}`.toUpperCase();
}

export default function FollowersPage() {
  const router = useRouter();
  const { receiveMessage } = useWebSocket();
  const [followers, setFollowers] = useState<FollowerSummary[]>([]);
  const [following, setFollowing] = useState<FollowerSummary[]>([]);
  const [followStatuses, setFollowStatuses] = useState<
    Record<number, FollowStatus>
  >({});
  const [relationship, setRelationship] = useState<Relationship>("followers");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyID, setBusyID] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadPeople() {
      try {
        const user = await profileService.getCurrentUser();
        const [followerList, followingList] = await Promise.all([
          profileService.getFollowers(user.id),
          profileService.getFollowing(user.id),
        ]);
        if (!active) return;
        setFollowers(followerList);
        setFollowing(followingList);
        setFollowStatuses(
          Object.fromEntries(
            followingList.map((person) => [person.id, "accepted" as const]),
          ),
        );
      } catch (reason: unknown) {
        if (!active) return;
        const message =
          reason instanceof Error ? reason.message : "Could not load people";
        setError(message);
        if (message.toLowerCase().includes("not logged in"))
          router.push("/login");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadPeople();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(
    () =>
      receiveMessage((event) => {
        if (
          event.type !== "presence" ||
          !("user_id" in event) ||
          typeof event.online !== "boolean"
        )
          return;
        setFollowers((current) =>
          current.map((person) =>
            person.id === event.user_id
              ? { ...person, online: event.online }
              : person,
          ),
        );
        setFollowing((current) =>
          current.map((person) =>
            person.id === event.user_id
              ? { ...person, online: event.online }
              : person,
          ),
        );
      }),
    [receiveMessage],
  );

  const people = relationship === "followers" ? followers : following;
  const visiblePeople = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return people;
    return people.filter((person) =>
      `${person.first_name} ${person.last_name} ${person.nickname}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [people, query]);

  async function toggleFollow(person: FollowerSummary) {
    const currentStatus = followStatuses[person.id] ?? "none";
    setBusyID(person.id);
    setError("");
    try {
      const result =
        currentStatus === "accepted"
          ? await profileService.unfollow(person.id)
          : await profileService.follow(person.id);
      setFollowStatuses((current) => ({
        ...current,
        [person.id]: result.status,
      }));
      if (result.status === "accepted") {
        setFollowing((current) =>
          current?.some((item) => item.id === person.id)
            ? current
            : [...current, person],
        );
      } else if (result.status === "none") {
        setFollowing((current) =>
          current.filter((item) => item.id !== person.id),
        );
      }
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not update follow status",
      );
    } finally {
      setBusyID(null);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-100 pb-24 text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-xl px-4 pb-3 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                Your people
              </p>
              <h1 className="text-2xl font-bold">Followers</h1>
            </div>
            <Link
              href="/profile"
              className="text-xs font-semibold text-zinc-600"
            >
              Your profile
            </Link>
          </div>
          <label className="flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 py-2.5 text-zinc-500">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#262626] outline-none placeholder:text-[#6B7280]"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 rounded-xl bg-[#E5E7EB] p-1">
            {(["followers", "following"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setRelationship(tab)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${relationship === tab ? "bg-white text-black" : "text-zinc-600"}`}
              >
                {tab}{" "}
                <span className="ml-1 text-xs">
                  {tab === "followers" ? followers.length : following?.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-3 py-3">
        {error && (
          <p
            role="alert"
            className="mb-3 rounded-xl bg-[#F3F4F6] p-3 text-sm text-[#262626]"
          >
            {error}
          </p>
        )}
        {loading ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            Loading people…
          </p>
        ) : visiblePeople?.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-12 text-center">
            <Users size={25} className="mx-auto text-zinc-500" />
            <p className="mt-3 text-sm font-semibold">
              No {relationship} found
            </p>
            <p className="mt-1 text-xs text-zinc-500">Try another search.</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white px-4">
            {visiblePeople?.map((person) => {
              const status = followStatuses[person.id] ?? "none";
              return (
                <li key={person.id} className="flex items-center gap-3 py-4">
                  <Link
                    href={`/profile/${person.id}`}
                    className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#C2DCFB] text-sm font-bold text-[#111827]"
                  >
                    {person.avatar_path ? (
                      <img
                        src={profileService.avatarURL(person.avatar_path)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(person.first_name, person.last_name)
                    )}
                    {person.online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#4ADE80]" />
                    )}
                  </Link>
                  <Link
                    href={`/profile/${person.id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm font-bold text-[#111827]">
                      {person.first_name} {person.last_name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      @
                      {person.nickname ||
                        `${person.first_name}${person.last_name}`
                          .replace(/\s+/g, "")
                          .toLowerCase()}
                    </p>
                    <span
                      className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${person.online ? "text-[#262626]" : "text-[#6B7280]"}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${person.online ? "bg-[#4ADE80]" : "bg-[#E5E7EB]"}`}
                      />
                      {person.online ? "ONLINE" : "OFFLINE"}
                    </span>
                  </Link>
                  <button
                    type="button"
                    disabled={busyID === person.id || status === "pending"}
                    onClick={() => void toggleFollow(person)}
                    className={`rounded-full px-3.5 py-2 text-xs font-bold ${status === "accepted" ? "border border-zinc-200 bg-white text-[#111827]" : status === "pending" ? "bg-[#E5E7EB] text-[#6B7280]" : "bg-black text-white"}`}
                  >
                    {busyID === person.id
                      ? "Saving…"
                      : status === "accepted"
                        ? "Unfollow"
                        : status === "pending"
                          ? "Requested"
                          : "Follow"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <MobileBottomNav active="people" />
    </main>
  );
}
